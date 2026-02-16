const ADJECTIVES = ['Silent', 'Hungry', 'Mystic', 'Brave', 'Cunning', 'Swift', 'Shadow', 'Ancient', 'Lone', 'Wild'];
const NOUNS = ['Wolf', 'Hunter', 'Seer', 'Villager', 'Guardian', 'Witch', 'Ghost', 'Stalker', 'Alpha', 'Omega'];

export const generateUsername = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    return `${adj}${noun}${num}`;
};

export const generateAvatar = (seed) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};
