export const ROLES = {
    WEREWOLF: {
        name: 'Serigala',
        team: 'werewolves',
        description: 'Bunuh satu warga setiap malam. Jangan sampai ketahuan!',
        icon: '🐺',
        color: '#E0006F'
    },
    VILLAGER: {
        name: 'Warga',
        team: 'villagers',
        description: 'Temukan Serigala dan usir mereka saat voting.',
        icon: '👨',
        color: '#94a3b8'
    },
    SEER: {
        name: 'Penerawang',
        team: 'villagers',
        description: 'Terawang peran satu pemain setiap malam.',
        icon: '👁️',
        color: '#a855f7'
    },
    DOCTOR: {
        name: 'Dokter',
        team: 'villagers',
        description: 'Lindungi satu pemain dari serangan Serigala setiap malam.',
        icon: '💊',
        color: '#10b981'
    },
    HUNTER: {
        name: 'Pemburu',
        team: 'villagers',
        description: 'Jika kamu mati, kamu bisa menembak satu pemain lain untuk ikut mati.',
        icon: '🏹',
        color: '#f59e0b'
    },
    GUARDIAN: {
        name: 'Penjaga',
        team: 'villagers',
        description: 'Lindungi satu pemain. Tidak bisa melindungi orang yang sama dua kali berturut-turut.',
        icon: '🛡️',
        color: '#3b82f6'
    }
};

export const assignRoles = (players, customCounts = null) => {
    const count = players.length;
    let rolesPool = [];

    if (customCounts) {
        // Use custom counts if provided from Settings
        for (let i = 0; i < customCounts.werewolves; i++) rolesPool.push(ROLES.WEREWOLF);
        for (let i = 0; i < customCounts.seer; i++) rolesPool.push(ROLES.SEER);
        for (let i = 0; i < customCounts.doctor; i++) rolesPool.push(ROLES.DOCTOR);
        for (let i = 0; i < (customCounts.hunter || 0); i++) rolesPool.push(ROLES.HUNTER);
        for (let i = 0; i < (customCounts.guardian || 0); i++) rolesPool.push(ROLES.GUARDIAN);

        // Fill remaining with Villagers
        while (rolesPool.length < count) {
            rolesPool.push(ROLES.VILLAGER);
        }
        // If we have more roles than players, trim it
        rolesPool = rolesPool.slice(0, count);
    } else {
        // Fallback to original distribution logic
        if (count <= 6) {
            rolesPool = [ROLES.WEREWOLF, ROLES.SEER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
        } else if (count <= 8) {
            rolesPool = [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.DOCTOR, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
        } else {
            rolesPool = [ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.WEREWOLF, ROLES.SEER, ROLES.DOCTOR, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER, ROLES.VILLAGER];
        }
        rolesPool = rolesPool.slice(0, count);
    }

    // Shuffle pool
    rolesPool = rolesPool.sort(() => Math.random() - 0.5);

    return players.map((player, index) => ({
        ...player,
        role: rolesPool[index],
        alive: true,
        vote: null,
        protectedBy: null, // For Doctor/Guardian
        lastProtected: null, // For Guardian
        hasFired: false // For Hunter
    }));
};

export const checkWinCondition = (players) => {
    const alivePlayers = players.filter(p => p.alive);
    const werewolves = alivePlayers.filter(p => p.role.team === 'werewolves');
    const villagers = alivePlayers.filter(p => p.role.team === 'villagers');

    if (werewolves.length === 0) {
        return 'villagers';
    }
    if (werewolves.length >= villagers.length) {
        return 'werewolves';
    }
    return null;
};
