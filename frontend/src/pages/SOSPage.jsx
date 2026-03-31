import React, { useState, useEffect, useRef } from 'react';

const NGO_DOCTORS = [
  {
    id: 1, name: 'Dr. Priya Sharma', ngo: 'iCall', org: 'TISS',
    specialties: ['Anxiety', 'Depression', 'Trauma'],
    languages: ['English', 'Hindi'],
    status: 'available', avatar: '👩‍⚕️'
  },
  {
    id: 2, name: 'Dr. Arjun Mehta', ngo: 'SNEHI',
    specialties: ['Grief', 'Relationships', 'Stress'],
    languages: ['English', 'Hindi', 'Marathi'],
    status: 'available', avatar: '👨‍⚕️'
  },
  {
    id: 3, name: 'Dr. Kavya Nair', ngo: 'Vandrevala Foundation',
    specialties: ['Suicidal ideation', 'Crisis support', 'PTSD'],
    languages: ['English', 'Malayalam', 'Tamil'],
    status: 'in-session', avatar: '👩‍⚕️'
  },
  {
    id: 4, name: 'Dr. Rohan Das', ngo: 'iCall', org: 'TISS',
    specialties: ['Addiction', 'Family issues', 'Anger'],
    languages: ['English', 'Bengali', 'Hindi'],
    status: 'available', avatar: '👨‍⚕️'
  },
  {
    id: 5, name: 'Dr. Meera Iyer', ngo: 'SNEHI',
    specialties: ['Eating disorders', 'Self-harm', 'OCD'],
    languages: ['English', 'Kannada'],
    status: 'available', avatar: '👩‍⚕️'
  },
  {
    id: 6, name: 'Dr. Vikram Patel', ngo: 'Vandrevala Foundation',
    specialties: ['Bipolar', 'Schizophrenia', 'Psychosis'],
    languages: ['English', 'Gujarati', 'Hindi'],
    status: 'in-session', avatar: '👨‍⚕️'
  }
];

function ConnectingOverlay({ doctor, mode, onCancel, onConnected }) {
  const [phase, setPhase] = useState('connecting'); // connecting | connected
  const jitsiRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('connected');
      loadJitsi();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const loadJitsi = () => {
    const roomName = `sahara-sos-${doctor.id}-${Date.now()}`;
    const script = document.createElement('script');
    script.src = 'https://meet.jit.si/external_api.js';
    script.onload = () => {
      if (!containerRef.current) return;
      const api = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: mode === 'audio',
          disableDeepLinking: true
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'tileview'],
          SHOW_JITSI_WATERMARK: false
        }
      });
      jitsiRef.current = api;
      api.addEventListener('readyToClose', onCancel);
    };
    document.head.appendChild(script);
  };

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col items-center justify-center">
      {phase === 'connecting' ? (
        <div className="text-center">
          {/* Radar animation */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="radar-ring absolute inset-0 rounded-full border-2 border-sahara-400 opacity-60" />
            <div className="radar-ring absolute inset-0 rounded-full border-2 border-sahara-400 opacity-40" />
            <div className="radar-ring absolute inset-0 rounded-full border-2 border-sahara-400 opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl">{doctor.avatar}</span>
            </div>
          </div>
          <h2 className="text-white text-xl font-semibold mb-2">Connecting...</h2>
          <p className="text-gray-400 text-sm mb-1">{doctor.name}</p>
          <p className="text-sahara-400 text-xs">{doctor.ngo}</p>
          <button onClick={onCancel}
            className="mt-8 text-gray-500 hover:text-gray-300 text-sm border border-gray-700 px-4 py-2 rounded-lg transition-colors">
            Cancel
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{doctor.avatar}</span>
              <div>
                <p className="text-white text-sm font-semibold">{doctor.name}</p>
                <p className="text-gray-400 text-xs">{doctor.ngo} · {mode === 'audio' ? 'Audio Call' : 'Video Call'}</p>
              </div>
            </div>
            <button onClick={onCancel}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              End Call
            </button>
          </div>
          <div ref={containerRef} className="flex-1" />
        </div>
      )}
    </div>
  );
}

export default function SOSPage() {
  const [call, setCall] = useState(null); // { doctor, mode }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🆘</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">SOS — Immediate Support</h1>
        <p className="text-gray-500 text-sm max-w-lg mx-auto">
          Connect directly with NGO-backed mental health professionals via video or audio call. All calls are confidential.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NGO_DOCTORS.map(doc => (
          <div key={doc.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{doc.avatar}</span>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">{doc.name}</h3>
                  <span className="text-xs text-sahara-600 font-medium">{doc.ngo}</span>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                doc.status === 'available'
                  ? 'bg-green-50 text-green-600'
                  : 'bg-orange-50 text-orange-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                  doc.status === 'available' ? 'bg-green-500' : 'bg-orange-400'
                }`} />
                {doc.status === 'available' ? 'Available' : 'In Session'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {doc.specialties.map(s => (
                <span key={s} className="text-xs bg-sahara-50 text-sahara-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4">🌐 {doc.languages.join(', ')}</p>

            <div className="flex gap-2">
              <button
                disabled={doc.status !== 'available'}
                onClick={() => setCall({ doctor: doc, mode: 'video' })}
                className="flex-1 bg-sahara-500 hover:bg-sahara-600 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs py-2 rounded-lg transition-colors font-medium">
                📹 Video
              </button>
              <button
                disabled={doc.status !== 'available'}
                onClick={() => setCall({ doctor: doc, mode: 'audio' })}
                className="flex-1 bg-white hover:bg-sahara-50 disabled:bg-gray-50 disabled:text-gray-300 text-sahara-600 text-xs py-2 rounded-lg border border-sahara-200 transition-colors font-medium">
                📞 Audio
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-red-600 font-semibold text-sm mb-1">In immediate danger?</p>
        <p className="text-red-400 text-xs">Call iCall: <strong>9152987821</strong> · SNEHI: <strong>044-24640050</strong> · Vandrevala: <strong>1860-2662-345</strong></p>
      </div>

      {call && (
        <ConnectingOverlay
          doctor={call.doctor}
          mode={call.mode}
          onCancel={() => setCall(null)}
        />
      )}
    </div>
  );
}
