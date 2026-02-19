# Flask Backend for R.K. Textiles
# Phone-Based Inventory and Billing Management System

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv

# Import routes
from routes import customers, orders, inventory, billing, mills, reports

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for Next.js frontend

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SUPABASE_URL'] = os.getenv('SUPABASE_URL')
app.config['SUPABASE_KEY'] = os.getenv('SUPABASE_KEY')

# Register blueprints (routes)
app.register_blueprint(customers.bp, url_prefix='/api/customers')
app.register_blueprint(orders.bp, url_prefix='/api/orders')
app.register_blueprint(inventory.bp, url_prefix='/api/inventory')
app.register_blueprint(billing.bp, url_prefix='/api/bills')
app.register_blueprint(mills.bp, url_prefix='/api/mills')
app.register_blueprint(reports.bp, url_prefix='/api/reports')

# Root route
@app.route('/')
def index():
    return jsonify({
        'message': 'R.K. Textiles API Server',
        'version': '1.0.0',
        'status': 'running',
        'timestamp': datetime.now().isoformat()
    })

# Health check route
@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Route not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    print(f"\n{'='*50}")
    print(f"🚀 R.K. Textiles Backend Server Starting...")
    print(f"{'='*50}")
    print(f"📍 Server running on: http://0.0.0.0:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"{'='*50}\n")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
