// Sound Assets (Using reliable public URLs or placeholders)
const SOUNDS = {
    bgm_lobby: '',
    wolf_howl: '',
    morning_rooster: '',
    vote_tick: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_736a735622.mp3', // Only keep tick sound
    kill_slash: '',
    player_join: '',
    win_fanfare: '',
    game_start: ''
};

const audioCache = {};

// Preload sounds
export const preloadSounds = () => {
    Object.keys(SOUNDS).forEach(key => {
        const audio = new Audio(SOUNDS[key]);
        audio.volume = 0.5;
        audioCache[key] = audio;
    });
};

export const playSound = (soundName) => {
    const audio = audioCache[soundName] || new Audio(SOUNDS[soundName]);

    // Reset if already playing (for overlapping sounds like clicks)
    if (!audio.paused) {
        audio.currentTime = 0;
    }

    // Specific volume adjustments
    if (soundName === 'bgm_lobby') audio.volume = 0.3;
    if (soundName === 'wolf_howl') audio.volume = 0.6;

    audio.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
};

export const stopSound = (soundName) => {
    if (audioCache[soundName]) {
        audioCache[soundName].pause();
        audioCache[soundName].currentTime = 0;
    }
};
