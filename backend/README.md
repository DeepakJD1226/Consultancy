# R.K. Textiles - Flask Backend

Phone-Based Inventory and Billing Management System

## 📋 Features

- **Customer Management**: CRUD operations for customer data with phone-based search
- **Order Management**: Real-time order processing with inventory validation
- **Inventory Tracking**: Stock management with low-stock alerts
- **Billing System**: Automated bill generation with PDF export
- **Mill Coordination**: Track raw materials and finished goods from mills
- **Reports & Analytics**: Comprehensive business insights and statistics

## 🚀 Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Supabase account and project
- pip (Python package manager)

### Installation

1. **Clone or navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - Mac/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     copy .env.example .env
     ```
   - Edit `.env` and add your Supabase credentials

6. **Run the server**:
   ```bash
   python app.py
   ```

The server will start at `http://localhost:5000`

## 📡 API Endpoints

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/:id` - Get customer by ID
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/search?phone=xxx` - Search by phone

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Cancel order
- `POST /api/orders/check-availability` - Check stock availability

### Inventory
- `GET /api/inventory` - Get all inventory
- `POST /api/inventory` - Add inventory
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory
- `GET /api/inventory/low-stock` - Get low stock items
- `GET /api/inventory/summary` - Get inventory summary

### Bills
- `GET /api/bills` - Get all bills
- `POST /api/bills` - Generate bill
- `GET /api/bills/:id` - Get bill by ID
- `PUT /api/bills/:id/payment` - Update payment status
- `GET /api/bills/:id/download` - Download bill PDF
- `GET /api/bills/summary` - Get billing summary

### Mills
- `GET /api/mills` - Get all mills
- `POST /api/mills` - Add new mill
- `GET /api/mills/raw-materials` - Get raw material records
- `POST /api/mills/raw-materials` - Send raw materials to mill
- `PUT /api/mills/raw-materials/:id` - Update production status
- `GET /api/mills/performance` - Get mill performance stats

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/customers` - Customer analytics
- `GET /api/reports/dashboard` - Dashboard statistics

## 🗄️ Database Schema

The backend uses Supabase (PostgreSQL) with the following tables:

- `customers` - Customer information
- `inventory` - Fabric stock data
- `orders` - Phone order records
- `bills` - Billing information
- `mills` - Mill details
- `raw_materials` - Mill production tracking
- `users` - System users (authentication)

## 🔧 Project Structure

```
backend/
├── app.py                 # Main Flask application
├── config.py              # Configuration
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── routes/                # API route handlers
│   ├── customers.py
│   ├── orders.py
│   ├── inventory.py
│   ├── billing.py
│   ├── mills.py
│   └── reports.py
├── services/              # Business logic services
│   ├── supabase_client.py
│   └── pdf_generator.py
└── utils/                 # Utility functions
```

## 🧪 Testing

Test the API endpoints using tools like:
- **Postman**: Import the API collection
- **cURL**: Command-line testing
- **Frontend**: Use the Next.js frontend

Example cURL request:
```bash
curl http://localhost:5000/api/customers
```

## 📝 Notes

- Make sure to set up the Supabase database tables before running
- The server runs in debug mode by default for development
- Use environment variables for production deployment

## 🚀 Deployment

For production deployment:
1. Set `FLASK_ENV=production` in `.env`
2. Use a production WSGI server like Gunicorn
3. Deploy to platforms like:
   - Render
   - Railway
   - PythonAnywhere
   - Heroku

---

**Built for R.K. Textiles Academic Project**
