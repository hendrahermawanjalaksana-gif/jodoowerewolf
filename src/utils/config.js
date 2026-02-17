export const DEFAULT_CONFIG = {
    durations: {
        night: 30,
        morning_result: 7,
        discuss: 60,
        vote: 15,
        elimination_result: 7
    },
    roles: {
        minPlayers: 5,
        counts: {
            werewolves: 1,
            seer: 1,
            doctor: 1,
            hunter: 0,
            guardian: 0
        },
        distributions: [
            { maxPlayers: 6, pool: ['WEREWOLF', 'SEER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'] },
            { maxPlayers: 8, pool: ['WEREWOLF', 'WEREWOLF', 'SEER', 'DOCTOR', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'] },
            { maxPlayers: 12, pool: ['WEREWOLF', 'WEREWOLF', 'WEREWOLF', 'SEER', 'DOCTOR', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER', 'VILLAGER'] }
        ]
    }
};
