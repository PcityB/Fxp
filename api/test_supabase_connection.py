#!/usr/bin/env python3
"""
Test script to verify Supabase database connection and migration.
Run this script after completing the Supabase migration to ensure everything is working correctly.
"""

import os
import sys
from datetime import datetime
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
    else:
        print("⚠️  Non-Supabase DATABASE_URL detected")
        print(f"   Connection string: {database_url[:50]}...")
    
    return True

def test_database_connection():
    """Test basic database connection."""
    print("\n🔍 Testing database connection...")
    
    try:
        from db.database import check_db_connection
        
        if check_db_connection():
            print("✅ Database connection successful")
            return True
        else:
            print("❌ Database connection failed")
            return False
    except Exception as e:
        print(f"❌ Database connection error: {str(e)}")
        return False

def test_ssl_configuration():
    """Test SSL configuration for Supabase."""
    print("\n🔍 Testing SSL configuration...")
    
    try:
        from db.database import engine, DATABASE_URL
        
        if "supabase.co" in DATABASE_URL:
            connect_args = engine.pool._creator.keywords.get('connect_args', {})
            if connect_args.get('sslmode') == 'require':
                print("✅ SSL is properly configured for Supabase")
                return True
            else:
                print("⚠️  SSL configuration not detected")
                return False
        else:
            print("ℹ️  Non-Supabase connection, SSL check skipped")
            return True
    except Exception as e:
        print(f"❌ SSL configuration check error: {str(e)}")
        return False

def test_database_initialization():
    """Test database initialization and table creation."""
    print("\n🔍 Testing database initialization...")
    
    try:
        from db.database import init_db
        
        init_db()
        print("✅ Database initialization successful")
        return True
    except Exception as e:
        print(f"❌ Database initialization error: {str(e)}")
        return False

def test_system_settings():
    """Test system settings table and data."""
    print("\n🔍 Testing system settings...")
    
    try:
        from db.database import get_db
        from db.models import SystemSetting
        
        with get_db() as db:
            settings = db.query(SystemSetting).all()
            
            if settings:
                print(f"✅ Found {len(settings)} system settings")
                for setting in settings:
                    print(f"   - {setting.setting_key}: {setting.setting_value}")
                return True
            else:
                print("⚠️  No system settings found")
                return False
    except Exception as e:
        print(f"❌ System settings test error: {str(e)}")
        return False

def test_timescaledb_extension():
    """Test TimescaleDB extension availability."""
    print("\n🔍 Testing TimescaleDB extension...")
    
    try:
        from db.database import engine
        
        with engine.connect() as conn:
            result = conn.execute("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'").fetchone()
            
            if result:
                print("✅ TimescaleDB extension is enabled")
                
                # Check for hypertables
                hypertables = conn.execute("""
                    SELECT hypertable_name 
                    FROM timescaledb_information.hypertables
                """).fetchall()
                
                if hypertables:
                    print(f"✅ Found {len(hypertables)} hypertables:")
                    for ht in hypertables:
                        print(f"   - {ht[0]}")
                else:
                    print("⚠️  No hypertables found")
                
                return True
            else:
                print("⚠️  TimescaleDB extension not enabled")
                print("   Application will work with regular PostgreSQL tables")
                return True
    except Exception as e:
        print(f"❌ TimescaleDB test error: {str(e)}")
        return False

def test_table_creation():
    """Test that all required tables are created."""
    print("\n🔍 Testing table creation...")
    
    try:
        from db.database import engine
        
        expected_tables = [
            'forex_data', 'processed_data', 'patterns', 'pattern_instances',
            'pattern_performance', 'users', 'jobs', 'visualizations', 'system_settings'
        ]
        
        with engine.connect() as conn:
            result = conn.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """).fetchall()
            
            existing_tables = [row[0] for row in result]
            
            missing_tables = set(expected_tables) - set(existing_tables)
            extra_tables = set(existing_tables) - set(expected_tables)
            
            if not missing_tables:
                print(f"✅ All {len(expected_tables)} required tables exist")
                if extra_tables:
                    print(f"ℹ️  Additional tables found: {', '.join(extra_tables)}")
                return True
            else:
                print(f"❌ Missing tables: {', '.join(missing_tables)}")
                return False
    except Exception as e:
        print(f"❌ Table creation test error: {str(e)}")
        return False

def main():
    """Run all tests and provide summary."""
    print("🚀 Supabase Migration Test Suite")
    print("=" * 50)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Database Connection", test_database_connection),
        ("SSL Configuration", test_ssl_configuration),
        ("Database Initialization", test_database_initialization),
        ("System Settings", test_system_settings),
        ("TimescaleDB Extension", test_timescaledb_extension),
        ("Table Creation", test_table_creation),
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
        print("\n🎉 All tests passed! Supabase migration is successful.")
        print("\nNext steps:")
        print("1. Run your application to verify full functionality")
        print("2. Test data operations (create, read, update, delete)")
        print("3. Monitor performance in Supabase dashboard")
        print("4. Set up monitoring and alerts")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Please review the errors above.")
        print("\nTroubleshooting:")
        print("1. Check your .env file configuration")
        print("2. Verify Supabase project is active")
        print("3. Ensure database credentials are correct")
        print("4. Check network connectivity to Supabase")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
