# Simple Backend for Testing (No Supabase Required)
from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return jsonify({
        'message': 'R.K. Textiles API Server (Simple Mode)',
        'version': '1.0.0',
        'status': 'running',
        'mode': 'simple',
        'timestamp': datetime.now().isoformat(),
        'note': 'This is a simplified version without Supabase. Use app.py for full features.'
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

# Mock endpoints for testing
@app.route('/api/customers')
def get_customers():
    return jsonify({
        'success': True,
        'data': [
            {'id': '1', 'name': 'Sample Customer', 'phone': '1234567890', 'business_type': 'Hotel'},
        ],
        'count': 1
    })

@app.route('/api/inventory')
def get_inventory():
    return jsonify({
        'success': True,
        'data': [
            {'id': '1', 'fabric_type': 'Cotton Fabric', 'fabric_color': 'White', 'quantity_meters': 100, 'rate_per_meter': 120},
        ],
        'count': 1
    })

@app.route('/api/orders')
def get_orders():
    return jsonify({
        'success': True,
        'data': [],
        'count': 0
    })

@app.route('/api/reports/dashboard')
def get_dashboard():
    return jsonify({
        'success': True,
        'data': {
            'customers': {'total': 1},
            'orders': {'total': 0, 'pending': 0},
            'revenue': {'total': 0, 'pending_payments': 0},
            'inventory': {'total_value': 12000, 'low_stock_items': 0},
            'recent_orders': []
        }
    })

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"🚀 R.K. Textiles Backend Server Starting (SIMPLE MODE)...")
    print(f"{'='*60}")
    print(f"📍 Server: http://localhost:5000")
    print(f"🔧 Mode: Simple (No Supabase required)")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True)
