import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  { icon: '💬', title: 'Community', desc: 'Share your thoughts anonymously and find support from others.', to: '/community' },
  { icon: '🤝', title: 'Get Help', desc: 'Connect with trained volunteer listeners for one-on-one chat.', to: '/help' },
  { icon: '📚', title: 'Resources', desc: 'Browse videos and guides curated by our volunteers.', to: '/resources' },
  { icon: '🆘', title: 'SOS', desc: 'Immediate video/audio connection with NGO-backed professionals.', to: '/sos' }
];

export default function HomePage() {
  const { user } = useAuth();
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🌵</div>
        <h1 className="text-4xl font-bold text-sahara-700 mb-3">Welcome to Sahara</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          A safe, anonymous space to share, heal, and find support — whenever you need it.
        </p>
        <div className="mt-4 inline-block bg-sahara-100 text-sahara-700 text-sm px-4 py-2 rounded-full font-mono">
          You are: {user?.anonymousUsername}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {features.map(f => (
          <Link key={f.to} to={f.to}
            className="bg-white rounded-2xl p-6 shadow-sm border border-sahara-100 hover:shadow-md hover:border-sahara-300 transition-all group">
            <div className="text-4xl mb-3">{f.icon}</div>
            <h2 className="text-lg font-semibold text-gray-800 group-hover:text-sahara-600 transition-colors">{f.title}</h2>
            <p className="text-gray-500 text-sm mt-1">{f.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-sahara-500 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">You're not alone</h2>
        <p className="text-sahara-100 text-sm max-w-md mx-auto">
          Sahara is a judgment-free zone. Everything you share is anonymous. Reach out whenever you're ready.
        </p>
      </div>
    </div>
  );
}
