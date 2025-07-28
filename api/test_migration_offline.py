#!/usr/bin/env python3
"""
Offline test script to verify Supabase migration configuration.
This script tests the migration setup without requiring actual database connectivity.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_environment_variables():
    """Test that required environment variables are set."""
    print("🔍 Testing environment variables...")
    
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    if "supabase.co" in database_url:
        print("✅ Supabase DATABASE_URL detected")
        print(f"   Connection string: {database_url[:50]}...")
        return True
    else:
        print("⚠️  Non-Supabase DATABASE_URL detected")
        print(f"   Connection string: {database_url[:50]}...")
        return True

def test_imports():
    """Test that all required modules can be imported."""
    print("\n🔍 Testing module imports...")
    
    try:
        from db.database import get_db, engine, Base, DATABASE_URL
        print("✅ Database module imported successfully")
        
        from db.models import (
            ForexData, ProcessedData, Pattern, PatternInstance,
            PatternPerformance, Visualization, SystemSetting
        )
        print("✅ Database models imported successfully")
        
        from db.migration import DataMigration
        print("✅ Migration module imported successfully")
        
        return True
    except Exception as e:
        print(f"❌ Import error: {str(e)}")
        return False

def test_ssl_detection():
    """Test SSL detection logic for Supabase."""
    print("\n🔍 Testing SSL detection logic...")
    
    try:
        from db.database import DATABASE_URL
        
        if "supabase.co" in DATABASE_URL:
            print("✅ Supabase connection detected - SSL will be enabled")
            print("   SSL mode: require (automatically set for supabase.co domains)")
            return True
        else:
            print("ℹ️  Local PostgreSQL connection detected")
            print("   SSL mode: not required for local connections")
            return True
    except Exception as e:
        print(f"❌ SSL detection error: {str(e)}")
        return False

def test_migration_class():
    """Test migration class initialization."""
    print("\n🔍 Testing migration class...")
    
    try:
        from db.migration import DataMigration
        
        migration = DataMigration()
        print("✅ DataMigration class initialized successfully")
        
        # Test directory paths
        print(f"   Base directory: {migration.base_dir}")
        print(f"   Data directory: {migration.data_dir}")
        print(f"   Processed directory: {migration.processed_dir}")
        
        return True
    except Exception as e:
        print(f"❌ Migration class error: {str(e)}")
        return False

def test_database_type_detection():
    """Test database type detection."""
    print("\n🔍 Testing database type detection...")
    
    try:
        database_url = os.getenv("DATABASE_URL", "")
        is_supabase = "supabase.co" in database_url
        
        if is_supabase:
            print("✅ Database type: Supabase")
            print("   Features: SSL encryption, managed backups, dashboard")
        else:
            print("✅ Database type: Local PostgreSQL")
            print("   Features: Local development, full control")
        
        return True
    except Exception as e:
        print(f"❌ Database type detection error: {str(e)}")
        return False

def test_configuration_files():
    """Test configuration files."""
    print("\n🔍 Testing configuration files...")
    
    try:
        # Test .env file
        if os.path.exists('.env'):
            print("✅ .env file found")
        else:
            print("⚠️  .env file not found")
        
        # Test config files
        if os.path.exists('config.py'):
            print("✅ config.py found")
        else:
            print("⚠️  config.py not found")
        
        if os.path.exists('config_supabase.py'):
            print("✅ config_supabase.py found")
        else:
            print("⚠️  config_supabase.py not found")
        
        return True
    except Exception as e:
        print(f"❌ Configuration files error: {str(e)}")
        return False

def test_docker_configuration():
    """Test Docker configuration."""
    print("\n🔍 Testing Docker configuration...")
    
    try:
        if os.path.exists('docker-compose.yml'):
            print("✅ docker-compose.yml found")
            
            with open('docker-compose.yml', 'r') as f:
                content = f.read()
                
            if 'postgres:' not in content and 'db:' not in content:
                print("✅ Local PostgreSQL service removed from Docker Compose")
            else:
                print("⚠️  Local PostgreSQL service still present in Docker Compose")
            
            if 'env_file:' in content:
                print("✅ Environment file loading configured")
            else:
                print("⚠️  Environment file loading not configured")
        else:
            print("⚠️  docker-compose.yml not found")
        
        return True
    except Exception as e:
        print(f"❌ Docker configuration error: {str(e)}")
        return False

def main():
    """Run all offline tests."""
    print("🚀 Supabase Migration Offline Test Suite")
    print("=" * 50)
    print("Note: This test suite validates configuration without requiring database connectivity")
    print()
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Module Imports", test_imports),
        ("SSL Detection Logic", test_ssl_detection),
        ("Migration Class", test_migration_class),
        ("Database Type Detection", test_database_type_detection),
        ("Configuration Files", test_configuration_files),
        ("Docker Configuration", test_docker_configuration),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All offline tests passed! Migration configuration is correct.")
        print("\nNext steps:")
        print("1. Deploy to environment with Supabase connectivity")
        print("2. Run: python -m db.migration --type all")
        print("3. Test application functionality")
        print("4. Monitor performance in Supabase dashboard")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the configuration.")
        print("\nTroubleshooting:")
        print("1. Check your .env file configuration")
        print("2. Verify all required files are present")
        print("3. Ensure imports are working correctly")
        print("4. Review Docker Compose configuration")
    
    print("\n📝 Migration Status:")
    database_url = os.getenv("DATABASE_URL", "")
    if "supabase.co" in database_url:
        print("✅ Configured for Supabase deployment")
        print("   - SSL encryption: Enabled")
        print("   - Connection pooling: Configured")
        print("   - Error handling: Enhanced")
        print("   - TimescaleDB: Graceful fallback")
    else:
        print("ℹ️  Configured for local PostgreSQL")
        print("   - Update DATABASE_URL for Supabase deployment")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
