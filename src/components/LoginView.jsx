import React from 'react';
import SpookyEyes from './SpookyEyes';

function LoginView({ usernameInput, setUsernameInput, handleGuestLogin, handleGoogleLogin }) {
    return (
        <div className="main-content">
            <div className="glass-card login-container">
                <div className="header">
                    <h1 className="neon-title">JODOO WEREWOLF</h1>
                    <p>Bergabunglah dengan warga atau pimpin para serigala.</p>
                </div>
                <div className="login-options">
                    <SpookyEyes />
                    <input
                        type="text"
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
    );
}

export default LoginView;
