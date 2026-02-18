import React from 'react';
import SpookyEyes from './SpookyEyes';

function LoginView({ usernameInput, setUsernameInput, handleGuestLogin, handleGoogleLogin }) {
    return (
        <div className="main-content">
            {/* Animated Background */}
            <div className="login-view-bg">
                <div className="sky-ambient"></div>

                {/* Moving Clouds */}
                <svg className="cloud cloud-1" viewBox="0 0 100 40"><path d="M10 30 Q30 10 50 30 T90 30 Z" /></svg>
                <svg className="cloud cloud-2" viewBox="0 0 100 40"><path d="M10 30 Q30 5 50 30 T90 30 Z" /></svg>
                <svg className="cloud cloud-3" viewBox="0 0 100 40"><path d="M10 25 Q30 10 50 25 T90 25 Z" /></svg>

                {/* Flying Birds */}
                <div className="bird-group bird-1">
                    <svg className="bird-svg" viewBox="0 0 20 20"><path d="M2 10 Q10 2 18 10 Q10 12 2 10" /></svg>
                </div>
                <div className="bird-group bird-2">
                    <svg className="bird-svg" viewBox="0 0 20 20"><path d="M2 10 Q10 2 18 10 Q10 12 2 10" /></svg>
                </div>
            </div>

            <div className="login-wrapper">
                <div className="glass-card login-info-column">
                    <div className="info-header">
                        <div className="wolf-badge">🐺</div>
                        <h2>Tentang Jodoo Werewolf</h2>
                    </div>
                    <div className="info-body">
                        <section className="info-section">
                            <h3>🎮 Multiplayer Real-Time</h3>
                            <p>Mainkan game sosial deduksi terpopuler secara online bersama teman atau pemain lain di seluruh dunia.</p>
                        </section>
                        <section className="info-section">
                            <h3>🎭 Berbagai Peran Unik</h3>
                            <p>Jadilah Werewolf yang licik, Warga yang waspada, Penerawang yang bijak, atau Dokter yang protektif.</p>
                        </section>
                        <section className="info-section">
                            <h3>📜 Cara Bermain</h3>
                            <ul>
                                <li><strong>Malam:</strong> Werewolf memilih mangsa, peran spesial menjalankan aksi mereka.</li>
                                <li><strong>Siang:</strong> Berdiskusi, mencari kebenaran, dan voting untuk mengeliminasi tersangka.</li>
                                <li><strong>Menang:</strong> Eliminasilah semua Werewolf untuk menang sebagai Warga!</li>
                            </ul>
                        </section>
                    </div>
                </div>

                <div className="glass-card login-container">
                    <div className="header">
                        <h1 className="neon-title">JODOO WEREWOLF</h1>
                        <p>Bergabunglah dengan warga atau pimpin para serigala.</p>
                    </div>
                    <div className="login-options">
                        <SpookyEyes />
                        <input
                            type="text"
                            id="login-username"
                            name="username"
                            className="username-input"
                            placeholder="Masukkan Nama Anda (Opsional)"
                            value={usernameInput}
                            onChange={(e) => setUsernameInput(e.target.value)}
                            maxLength={12}
                        />
                        <button className="glow-btn" onClick={handleGuestLogin}>MASUK</button>
                        <div className="divider"><span>ATAU</span></div>
                        <button className="google-btn" onClick={handleGoogleLogin}>
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" />
                            Masuk dengan Google
                        </button>
                    </div>
                    <div className="footer"><p>Dengan bermain, Anda menyetujui Ketentuan Layanan.</p></div>
                </div>
            </div>
        </div>
    );
}

export default LoginView;
