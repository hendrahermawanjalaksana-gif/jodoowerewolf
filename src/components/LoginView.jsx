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

                {/* Landscape Silhouettes */}
                <svg className="landscape-silhouette" viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice">
                    {/* Cliff on the left */}
                    <path className="cliff-path" d="M0 400 L0 150 Q150 150 250 200 L400 350 Q550 400 1000 400 Z" />

                    {/* Pine Trees on the cliff */}
                    <path className="tree-path" d="M30 150 L45 120 L60 150 Z M50 160 L65 130 L80 160 Z M10 170 L25 140 L40 170 Z" />

                    {/* Village on the right hill */}
                    <g className="village-path">
                        <rect x="850" y="320" width="30" height="40" /> <path d="M850 320 L865 290 L880 320" />
                        <rect x="890" y="340" width="25" height="30" /> <path d="M890 340 L902 320 L915 340" />
                        <rect x="830" y="350" width="20" height="20" /> <path d="M830 350 L840 335 L850 350" />
                    </g>

                    {/* Ground transition */}
                    <path fill="#000" d="M0 400 L1000 400 L1000 380 Q700 350 400 380 Q200 400 0 400" />
                </svg>
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
    );
}

export default LoginView;
