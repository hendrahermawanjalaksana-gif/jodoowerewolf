import React, { useEffect, useRef, useState } from 'react';

const SpookyEyes = () => {
    const eyesRef = useRef(null);
    const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });

    const [isBlinking, setIsBlinking] = useState(false);

    // Blinking Logic
    useEffect(() => {
        const blinkLoop = () => {
            setIsBlinking(true);
            setTimeout(() => {
                setIsBlinking(false);
                // Randomize next blink between 2s and 6s
                const nextBlink = Math.random() * 4000 + 2000;
                setTimeout(blinkLoop, nextBlink);
            }, 150); // Blink duration
        };

        const timeoutId = setTimeout(blinkLoop, 3000);
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (!eyesRef.current) return;

            const eyesRect = eyesRef.current.getBoundingClientRect();
            const eyesCenterX = eyesRect.left + eyesRect.width / 2;
            const eyesCenterY = eyesRect.top + eyesRect.height / 2;

            // Calculate angle between mouse and eye center
            const angle = Math.atan2(event.clientY - eyesCenterY, event.clientX - eyesCenterX);

            // Limit movement radius (smaller for wolf eyes)
            const radius = 6;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            setPupilPos({ x, y });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="wolf-face-container" ref={eyesRef}>
            <div className="wolf-ears">
                <div className="ear left"></div>
                <div className="ear right"></div>
            </div>
            <div className="spooky-eyes-row">
                <div className="eye-wrapper">
                    <div className="wolf-eyebrow left"></div>
                    <div className={`eye ${isBlinking ? 'blinking' : ''}`}>
                        <div className="pupil" style={{ transform: `translate(${pupilPos.x}px, ${pupilPos.y}px)` }}></div>
                    </div>
                </div>
                <div className="eye-wrapper">
                    <div className="wolf-eyebrow right"></div>
                    <div className={`eye ${isBlinking ? 'blinking' : ''}`}>
                        <div className="pupil" style={{ transform: `translate(${pupilPos.x}px, ${pupilPos.y}px)` }}></div>
                    </div>
                </div>
            </div>
            <div className="wolf-nose"></div>
            <div className="wolf-fangs">
                <div className="fang left"></div>
                <div className="fang right"></div>
            </div>
        </div>
    );
};

export default SpookyEyes;
