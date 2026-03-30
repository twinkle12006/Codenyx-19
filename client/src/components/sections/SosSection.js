import React, { useState, useEffect } from 'react';
import { getClinics, bookClinic } from '../../api/auth';

export default function SosSection() {
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crisisState, setCrisisState] = useState('idle');
  const [selected, setSelected] = useState(null);
  const [booked, setBooked] = useState({});

  const fetchClinics = async () => {
    try {
      const res = await getClinics();
      setClinics(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClinics(); }, []);

  // Refresh clinic availability every 30s
  useEffect(() => {
    const t = setInterval(fetchClinics, 30000);
    return () => clearInterval(t);
  }, []);

  const activateCrisis = () => {
    setCrisisState('connecting');
    setTimeout(() => setCrisisState('connected'), 2500);
  };

  const handleBook = async (id, e) => {
    e.stopPropagation();
    try {
      await bookClinic(id);
      setBooked(b => ({ ...b, [id]: true }));
      fetchClinics(); // refresh slot counts from DB
    } catch (e) {
      alert(e.response?.data?.message || 'Booking failed');
    }
  };

  return (
    <section className="section active" id="section-sos">
      <div className="sos-header">
        <div className="sos-header-content">
          <div className="sos-pulse-ring">🆘</div>
          <div>
            <h1 className="sh-title">SOS Crisis Support</h1>
            <p className="sh-subtitle">Immediate access to licensed therapists and emergency clinic slots.</p>
          </div>
        </div>
      </div>

      <div className="crisis-zone">
        <div className="crisis-btn-wrap">
          <button className={`crisis-btn${crisisState !== 'idle' ? ' activated' : ''}`} onClick={activateCrisis}>
            <div className="crisis-btn-inner">
              <span className="crisis-btn-icon">{crisisState === 'idle' ? '🤝' : crisisState === 'connecting' ? '⏳' : '✅'}</span>
              <span className="crisis-btn-text">{crisisState === 'idle' ? 'Connect to Therapist Now' : crisisState === 'connecting' ? 'Connecting...' : 'Dr. Ananya is ready'}</span>
              <span className="crisis-btn-sub">{crisisState === 'idle' ? 'Average wait: 90 seconds' : crisisState === 'connecting' ? 'Please wait' : 'Tap to join session'}</span>
            </div>
          </button>
        </div>
        <div className="crisis-or">or call a helpline directly</div>
        <div className="helpline-row">
          {[['iCall','9152987821','Mon–Sat, 8am–10pm'],['Vandrevala Foundation','1860-2662-345','24/7'],['SNEHI','044-24640050','Mon–Sat, 8am–10pm']].map(([name, num, hrs]) => (
            <a key={name} href={`tel:${num}`} className="helpline-card">
              <div className="hl-name">{name}</div>
              <div className="hl-num">{num}</div>
              <div className="hl-hrs">{hrs}</div>
            </a>
          ))}
        </div>
      </div>

    </section>
  );
}
