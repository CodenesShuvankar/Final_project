'use client';

import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <main className={styles.main}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>VibeTune</div>
        <nav className={styles.nav}>
          <a href="#features">Product</a>
          <Link href="/home">Launch App</Link>
          <Link href="/about">About Us</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        {/* Background Shapes */}
        <div className={styles.backgroundShapes}>
          <span className={styles.shape}></span>
          <span className={styles.shape}></span>
          <span className={styles.shape}></span>
        </div>

        {/* Hero Content */}
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            Revolutionizing the way you listen to Music!
          </h1>
          <p className={styles.subtitle}>
            Type. Tap. Tune. Your Music- Powered by AI.
          </p>
          <Link href="/home">
            <button className={styles.cta}>Enter App</button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className={styles.features}>
        <h2>Amazing Features</h2>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <h3>AI Music Recommender</h3>
            <p>Recommend you songs based on your mood.</p>
          </div>

          <div className={styles.featureCard}>
            <h3>Multiple Modal Emotion Detection</h3>
            <p>Detect emotions through voice and facial expressions.</p>
          </div>

          <div className={styles.featureCard}>
            <h3>Analytics of Listen History</h3>
            <p>Gain insights into your listening habits and preferences.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        © {new Date().getFullYear()} VibeTune - AI Music Studio
      </footer>
    </main>
  );
}
