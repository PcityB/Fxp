from src.pattern_analysis import PatternAnalyzer
import os
import pandas as pd
import json
import pickle
import uuid
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from db.repository import AnalysisRepository, PatternRepository
from db.database import get_db
from routers.system import register_task, update_task_progress, complete_task

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('analysis_service')

class AnalysisService:
    """
    Service class for pattern analysis operations.
    """
    
    def __init__(self):
        """
        Initialize the analysis service.
        """
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.data_dir = os.path.join(self.base_dir, "data")
        self.processed_dir = os.path.join(self.data_dir, "processed")
        self.patterns_dir = os.path.join(self.data_dir, "patterns")
        self.patterns_data_dir = os.path.join(self.patterns_dir, "data")
        self.analysis_dir = os.path.join(self.data_dir, "analysis")
        self.analysis_data_dir = os.path.join(self.analysis_dir, "data")
        self.analysis_viz_dir = os.path.join(self.analysis_dir, "visualizations")
        
        # Create directories if they don't exist
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.processed_dir, exist_ok=True)
        os.makedirs(self.patterns_data_dir, exist_ok=True)
        os.makedirs(self.analysis_data_dir, exist_ok=True)
        os.makedirs(self.analysis_viz_dir, exist_ok=True)
        
    def analyze_patterns(self, timeframe, lookahead_periods=10, significance_threshold=0.05, min_occurrences=5):
        """
        Analyze extracted patterns for profitability and statistical significance.
        
        Args:
            timeframe (str): Timeframe to analyze patterns for
            lookahead_periods (int): Number of periods to look ahead for returns calculation
            significance_threshold (float): P-value threshold for statistical significance
            min_occurrences (int): Minimum number of pattern occurrences required for analysis
            
        Returns:
            dict: Pattern analysis result information
        """
        try:
            # Create task ID for tracking
            task_id = f"pattern_analysis_{timeframe}_{uuid.uuid4().hex[:8]}"
            register_task(task_id, f"Pattern analysis for {timeframe} timeframe")
            
            # Initialize pattern analyzer
            analyzer = PatternAnalyzer(
                patterns_dir=self.patterns_dir,
                data_dir=self.processed_dir,
                output_dir=self.analysis_dir
            )
            
            # Load patterns
            update_task_progress(task_id, 0.1, "loading_patterns")
            patterns_data = analyzer.load_patterns(timeframe)
            if patterns_data is None:
                logger.error(f"Failed to load patterns for timeframe {timeframe}")
                complete_task(task_id, error=f"Failed to load patterns for timeframe {timeframe}")
                return None
                
            # Load processed data
            update_task_progress(task_id, 0.2, "loading_processed_data")
            df = analyzer.load_processed_data(timeframe)
            if df is None:
                logger.error(f"Failed to load processed data for timeframe {timeframe}")
                complete_task(task_id, error=f"Failed to load processed data for timeframe {timeframe}")
                return None
                
            # Analyze pattern profitability
            update_task_progress(task_id, 0.5, "analyzing_profitability")
            profitability = analyzer.analyze_pattern_profitability(
                timeframe=timeframe,
                lookahead_periods=lookahead_periods
            )
            
            if not profitability:
                logger.error(f"Failed to analyze profitability for timeframe {timeframe}")
                complete_task(task_id, error=f"Failed to analyze profitability for timeframe {timeframe}")
                return None
                
            # Compare pattern profitability
            update_task_progress(task_id, 0.7, "comparing_profitability")
            comparison = analyzer.compare_pattern_profitability(
                timeframe=timeframe,
                profitability=profitability
            )
            
            # Extract features for machine learning
            update_task_progress(task_id, 0.8, "extracting_features")
            X, y = analyzer.extract_pattern_features(timeframe)
            
            # Reduce dimensions for visualization
            update_task_progress(task_id, 0.9, "reducing_dimensions")
            X_reduced, pca = analyzer.reduce_dimensions(X, n_components=2)
            
            # Save results
            analysis_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Count profitable and significant clusters
            profitable_clusters = sum(1 for cluster in profitability.values() if cluster["mean_return"] > 0)
            significant_clusters = sum(1 for cluster in profitability.values() if cluster["p_value"] < significance_threshold)
            
            # Create statistical significance data
            statistical_significance = {}
            for cluster_id, stats in profitability.items():
                statistical_significance[str(cluster_id)] = {
                    "p_value": float(stats["p_value"]),
                    "t_statistic": float(stats["t_statistic"]),
                    "significant": stats["p_value"] < significance_threshold
                }
            
            # Create cluster returns data
            cluster_returns = {}
            for cluster_id, stats in profitability.items():
                if stats["count"] >= min_occurrences:
                    cluster_returns[str(cluster_id)] = {
                        "count": int(stats["count"]),
                        "avg_return": float(stats["mean_return"]),
                        "median_return": float(stats["median_return"]),
                        "std_return": float(stats["std_return"]),
                        "win_rate": float(stats["positive_rate"]),
                        "profit_factor": float(stats["mean_return"] / abs(stats["std_return"])) if stats["std_return"] != 0 else 0
                    }
            
            # Calculate overall profitability metrics
            all_returns = [stats["mean_return"] for stats in profitability.values() if stats["count"] >= min_occurrences]
            all_win_rates = [stats["positive_rate"] for stats in profitability.values() if stats["count"] >= min_occurrences]
            
            overall_profitability = {
                "avg_return": float(sum(all_returns) / len(all_returns)) if all_returns else 0,
                "win_rate": float(sum(all_win_rates) / len(all_win_rates)) if all_win_rates else 0,
                "profit_factor": float(sum(r for r in all_returns if r > 0) / abs(sum(r for r in all_returns if r < 0))) if sum(r for r in all_returns if r < 0) != 0 else 0
            }
            
            # Save analysis data
            analysis_data = {
                "timeframe": timeframe,
                "analysis_date": analysis_date,
                "lookahead_periods": lookahead_periods,
                "significance_threshold": significance_threshold,
                "min_occurrences": min_occurrences,
                "n_patterns": len(patterns_data["windows"]),
                "n_clusters": len(set(patterns_data["cluster_labels"])),
                "profitable_clusters": profitable_clusters,
                "significant_clusters": significant_clusters,
                "profitability": overall_profitability,
                "statistical_significance": statistical_significance,
                "cluster_returns": cluster_returns,
                "comparison": comparison
            }
            
            # Save to database and/or file using repository
            with get_db() as db:
                repo = AnalysisRepository(db)
                result = repo.save_analysis(timeframe, analysis_data)
                
                if not result:
                    logger.error(f"Failed to save analysis for timeframe {timeframe}")
                    
                    # Fall back to file-only save
                    json_path = os.path.join(self.analysis_data_dir, f"{timeframe}_analysis.json")
                    with open(json_path, 'w') as f:
                        json.dump(analysis_data, f, indent=2)
                    
                    result = {
                        "timeframe": timeframe,
                        "analysis_date": analysis_date,
                        "n_patterns": len(patterns_data["windows"]),
                        "n_clusters": len(set(patterns_data["cluster_labels"])),
                        "profitable_clusters": profitable_clusters,
                        "significant_clusters": significant_clusters,
                        "json_path": json_path
                    }
            
            # Create visualizations directory for this timeframe
            timeframe_viz_dir = os.path.join(self.analysis_viz_dir, timeframe)
            os.makedirs(timeframe_viz_dir, exist_ok=True)
            
            # Complete task
            complete_task(task_id, result=result)
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing patterns: {str(e)}")
            if 'task_id' in locals():
                complete_task(task_id, error=str(e))
            return None
            
    def get_analysis_details(self, timeframe):
        """
        Get detailed analysis results for a timeframe.
        
        Args:
            timeframe (str): Timeframe to get analysis details for
            
        Returns:
            dict: Analysis details
        """
        try:
            # Try to get analysis details from database first
            with get_db() as db:
                repo = AnalysisRepository(db)
                analysis_data = repo.get_analysis_details(timeframe)
                
                if analysis_data is not None:
                    return analysis_data
                    
            # If database retrieval failed, try file-based approach as fallback
            file_path = os.path.join(self.analysis_data_dir, f"{timeframe}_analysis.json")
            
            if not os.path.exists(file_path):
                logger.error(f"Analysis data file not found: {file_path}")
                return None
                
            with open(file_path, 'r') as f:
                analysis_data = json.load(f)
                
            return analysis_data
        except Exception as e:
            logger.error(f"Error getting analysis details: {str(e)}")
            return None
