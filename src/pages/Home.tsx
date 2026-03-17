import { Clock, Phone, Truck, Award } from 'lucide-react';

type HomeProps = {
  onNavigate: (page: string) => void;
};

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen rk-fade-up">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 text-center">
          <p className="inline-block mb-4 px-4 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm font-semibold">
            Textile Operations Platform
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-4 leading-tight">
            Premium Cotton Fabrics for Hotels
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            High-quality cotton stocks in white, grey, and custom colors
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onNavigate('shop-fabrics')}
              className="rk-btn-primary"
            >
              Browse Products
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="rk-btn-secondary"
            >
              Get Started
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 py-16">
          <div className="rk-card text-center p-6">
            <Award className="w-12 h-12 text-cyan-700 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Premium Quality</h3>
            <p className="text-slate-600">High-grade cotton fabrics for hotel bedsheets</p>
          </div>
          <div className="rk-card text-center p-6">
            <Clock className="w-12 h-12 text-cyan-700 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Quick Booking</h3>
            <p className="text-slate-600">Book online anytime, 9 AM to 8 PM operations</p>
          </div>
          <div className="rk-card text-center p-6">
            <Truck className="w-12 h-12 text-cyan-700 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Reliable Delivery</h3>
            <p className="text-slate-600">Fast and reliable shipping to your location</p>
          </div>
          <div className="rk-card text-center p-6">
            <Phone className="w-12 h-12 text-cyan-700 mx-auto mb-4" />
            <h3 className="font-semibold text-slate-900 mb-2">Dedicated Support</h3>
            <p className="text-slate-600">24/5 customer support during business hours</p>
          </div>
        </div>

        <div className="rk-card p-8 sm:p-12 my-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">About R.K. Textiles</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-slate-600 mb-4">
                R.K. Textiles specializes in premium cotton fabrics for the hospitality industry.
                We supply high-quality materials to hotels and businesses across the region.
              </p>
              <p className="text-slate-600 mb-4">
                With our commitment to excellence, we provide primarily white and grey cotton stocks,
                with custom colors available upon request.
              </p>
              <p className="text-slate-600">
                Our materials are sourced from two specialized mills, ensuring consistent quality
                and reliability in every order.
              </p>
            </div>
            <div>
              <div className="bg-cyan-50 rounded-xl p-6 border border-cyan-100">
                <h3 className="font-semibold text-slate-900 mb-4">Business Hours</h3>
                <p className="text-slate-600 mb-4">Monday to Friday: 9:00 AM to 8:00 PM</p>
                <p className="text-slate-600 mb-6">Saturday & Sunday: Closed</p>

                <h3 className="font-semibold text-slate-900 mb-4">Our Specialization</h3>
                <ul className="text-slate-600 space-y-2">
                  <li>✓ Hotel bedsheet fabrics</li>
                  <li>✓ Premium cotton quality</li>
                  <li>✓ White & grey colors</li>
                  <li>✓ Custom color options</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
