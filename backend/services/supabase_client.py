# Supabase Client for Flask Backend
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

class SupabaseClient:
    """Singleton Supabase client"""
    _instance = None
    _client: Client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SupabaseClient, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Supabase client"""
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_KEY')
        
        if not url or not key:
            raise ValueError("Supabase URL and KEY must be set in environment variables")
        
        self._client = create_client(url, key)
        print("✅ Supabase client initialized successfully")
    
    def get_client(self) -> Client:
        """Get the Supabase client instance"""
        return self._client

# Create a global instance
supabase_client = SupabaseClient()

def get_supabase() -> Client:
    """Helper function to get Supabase client"""
    return supabase_client.get_client()
