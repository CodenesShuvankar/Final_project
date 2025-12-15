'use client';

import Link from 'next/link';
import styles from './about.module.css';

export default function AboutPage() {
  const teamMembers = [
    {
      name: "Shuvankar Dhara",
      role: "Project Lead & Backend Engineer",
      bio: "Leading the VibeTune project with a focus on scalable backend architecture and AI integration.",
      photo: "/team1.jpg",
    },
    {
      name: "Sumit Paul",
      role: "ML Engineer",
      bio: "Passionate about machine learning and AI, specializing in emotion detection and recommendation systems.",
      photo: "/team2.jpg",
    },
    {
      name: "Swapnil Chatterjee",
      role: "Ui/UX Designer",
      bio: "Designing intuitive and engaging user experiences. Skilled in Figma, Adobe XD, and front-end development.",
      photo: "/team3.jpg",
    },
    {
      name: "Shubhobrata Maity",
      role: "Frontend Engineer",
      bio: "Building robust frontend systems and user interfaces. Expert in React, Next.js, and UI optimization.",
      photo: "/team4.jpg",
    },
    {
      name: "Dipu Raja Saha",
      role: "Data Analyst",
      bio: "Analyzing user data to derive insights and improve recommendation algorithms.",
      photo: "/team5.jpg",
    },
  ];

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.logo}>VibeTune</div>
        <nav className={styles.nav}>
          <Link href="/">Home</Link>
          <Link href="/about">About Us</Link>
          <Link href="/home">Get Started</Link>
        </nav>
      </header>

      <section className={styles.teamSection}>
        <h1>Meet the Team</h1>
        <p className={styles.subtitle}>
          The passionate minds behind VibeTune - revolutionizing music discovery with AI
        </p>
        
        <div className={styles.teamGrid}>
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className={`${styles.teamCard} ${
                index % 2 === 0 ? styles.leftImg : styles.rightImg
              }`}
            >
              <div className={styles.teamPhoto}>
                <div className={styles.photoPlaceholder}>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <div className={styles.teamInfo}>
                <h3>{member.name}</h3>
                <p className={styles.teamRole}>{member.role}</p>
                <p className={styles.teamBio}>{member.bio}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.projectSection}>
        <h2>About VibeTune</h2>
        <div className={styles.projectContent}>
          <p>
            VibeTune is an innovative music streaming platform that uses cutting-edge AI technology 
            to understand your emotions and recommend the perfect music for your mood.
          </p>
          <p>
            Our multimodal emotion detection system analyzes both voice and facial expressions 
            to accurately determine your current emotional state, then curates personalized 
            playlists that match your vibe.
          </p>
          <div className={styles.features}>
            <div className={styles.feature}>
              <h4>🎤 Voice Analysis</h4>
              <p>Advanced speech emotion recognition using Wav2Vec2 models</p>
            </div>
            <div className={styles.feature}>
              <h4>😊 Facial Recognition</h4>
              <p>Real-time emotion detection from facial expressions</p>
            </div>
            <div className={styles.feature}>
              <h4>🎵 Smart Recommendations</h4>
              <p>AI-powered music suggestions based on your emotional state</p>
            </div>
            <div className={styles.feature}>
              <h4>📊 Analytics</h4>
              <p>Track your listening habits and mood patterns over time</p>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} VibeTune - AI Music Studio</p>
        <p className={styles.footerLinks}>
          <Link href="/">Home</Link>
          <span>•</span>
          <Link href="/about">About</Link>
          <span>•</span>
          <Link href="/home">Get Started</Link>
        </p>
      </footer>
    </main>
  );
}
