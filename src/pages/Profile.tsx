import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, Customer, logFormSubmission } from '../lib/supabase';
import { User, Mail, Phone, MapPin, AlertCircle, CheckCircle, Building2, ShieldCheck, Sparkles } from 'lucide-react';

type ProfileProps = {
  onNavigate: (page: string) => void;
};

export function Profile({ onNavigate }: ProfileProps) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Partial<Customer>>({
    business_name: '',
    contact_person: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchFromCustomers = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      business_name: data.business_name,
      contact_person: data.contact_person,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
    } as Partial<Customer>;
  };

  const fetchFromUsers = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      business_name: data.business_name || data.name || '',
      contact_person: data.contact_person || data.name || '',
      email: data.email || user.email || '',
      phone: data.phone || '',
      address: data.address || '',
      city: data.city || '',
    } as Partial<Customer>;
  };

  useEffect(() => {
    if (user) {
      fetchProfile();
    } else {
      onNavigate('login');
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      setLoading(true);

      try {
        const customerData = await fetchFromCustomers();
        if (customerData) {
          setProfile(customerData);
          return;
        }
      } catch {
        // Fall back to users table.
      }

      const usersData = await fetchFromUsers();
      if (usersData) {
        setProfile(usersData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    try {
      if (!user) throw new Error('Not authenticated');
      if (!profile.business_name?.trim() || !profile.phone?.trim() || !profile.address?.trim()) {
        throw new Error('Please complete all required fields');
      }
      if (!/^[0-9+()\-\s]{8,20}$/.test(profile.phone.trim())) {
        throw new Error('Please enter a valid phone number');
      }

      const customerPayload = {
        id: user.id,
        business_name: profile.business_name,
        contact_person: profile.contact_person || profile.business_name || '',
        email: user.email,
        phone: profile.phone,
        address: profile.address,
        city: profile.city || '',
      };

      const { error: customersError } = await supabase
        .from('customers')
        .upsert(customerPayload, { onConflict: 'id' });

      if (customersError) {
        const { error: usersError } = await supabase.from('users').upsert(
          {
            id: user.id,
            email: user.email,
            name: profile.contact_person || profile.business_name || '',
            business_name: profile.business_name,
            contact_person: profile.contact_person || profile.business_name || '',
            phone: profile.phone,
            address: profile.address,
            city: profile.city || '',
          },
          { onConflict: 'id' }
        );

        if (usersError) throw customersError;
      }

      await logFormSubmission({
        userId: user.id,
        formType: 'profile_update',
        payload: {
          profile: {
            business_name: profile.business_name,
            contact_person: profile.contact_person,
            email: user.email,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
          },
        },
        status: 'success',
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      await logFormSubmission({
        userId: user?.id || null,
        formType: 'profile_update',
        payload: {
          profile,
        },
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Unknown profile update error',
      });
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onNavigate('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 rk-fade-up">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 rk-card p-6 sm:p-8 rk-hover-lift">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Account
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold rk-title">My Profile</h1>
              <p className="rk-text-muted mt-2">Manage your textile business details and delivery preferences.</p>
            </div>
            <div className="flex items-center gap-2 text-cyan-700 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              Profile Health: Active
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Profile updated successfully!</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="rk-card p-6 rk-hover-lift">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-cyan-700" />
              </div>
              <p className="text-sm rk-text-muted break-all">{user?.email}</p>
            </div>

            <div className="mb-6 p-4 rounded-xl border border-cyan-100 bg-cyan-50/70">
              <p className="text-xs uppercase tracking-wider font-semibold text-cyan-700 mb-2">Business Snapshot</p>
              <div className="space-y-2 text-sm rk-text-muted">
                <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-700" /> {profile.business_name || 'Business not set'}</p>
                <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-cyan-700" /> {profile.phone || 'Phone not set'}</p>
              </div>
            </div>

            <div className="space-y-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => onNavigate('bookings')}
                className="w-full px-4 py-2 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors font-medium"
              >
                View My Bookings
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="w-full px-4 py-2 text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors font-medium"
              >
                Browse Products
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="rk-card p-6 rk-hover-lift">
                <h2 className="text-xl font-bold rk-title mb-6 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Business Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={profile.business_name || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, business_name: e.target.value })
                      }
                      required
                      className="rk-input"
                      placeholder="Your hotel or business name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={profile.contact_person || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, contact_person: e.target.value })
                      }
                      className="rk-input"
                      placeholder="Name of contact person"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        value={profile.email || ''}
                        disabled
                        className="rk-input pl-10 opacity-80"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={profile.phone || ''}
                        onChange={(e) =>
                          setProfile({ ...profile, phone: e.target.value })
                        }
                        required
                        className="rk-input pl-10"
                        placeholder="10-digit phone number"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rk-card p-6 rk-hover-lift">
                <h2 className="text-xl font-bold rk-title mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={profile.address || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, address: e.target.value })
                      }
                      required
                      rows={3}
                      className="rk-input resize-none"
                      placeholder="Full delivery address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={profile.city || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, city: e.target.value })
                      }
                      className="rk-input"
                      placeholder="City"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => fetchProfile()}
                  className="flex-1 rk-btn-secondary"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rk-btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
