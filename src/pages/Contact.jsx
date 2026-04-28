import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import './Contact.css';

const Contact = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('submitting');
    try {
      await addDoc(collection(db, 'contacts'), {
        email: email.trim(),
        message: message.trim(),
        date: new Date(),
      });
      setStatus('done');
    } catch (err) {
      console.error('Contact submit failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="contact-page">
      <div className="contact-wrap">
        <h1 className="contact-title">Contact</h1>
        <p className="contact-subtitle">Questions or feedback — we'd love to hear from you.</p>

        {status === 'done' ? (
          <div className="contact-success">
            <div className="contact-success-icon">✓</div>
            <div className="contact-success-text">Message sent. Thanks!</div>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="contact-field">
              <label className="contact-label">Email</label>
              <input
                className="contact-input"
                type="email"
                placeholder="you@example.com (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
              />
            </div>
            <div className="contact-field">
              <label className="contact-label">Message</label>
              <textarea
                className="contact-input contact-textarea"
                placeholder="What's on your mind?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                disabled={status === 'submitting'}
              />
            </div>
            {status === 'error' && (
              <div className="contact-error">Something went wrong. Please try again.</div>
            )}
            <button
              className="contact-submit"
              type="submit"
              disabled={status === 'submitting' || !message.trim()}
            >
              {status === 'submitting' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;
