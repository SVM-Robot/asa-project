export function findIsolatedSections(map) {
    const rows = map.length;
    const cols = map[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const directions = [
        [-1, 0], [1, 0], // Up, Down
        [0, -1], [0, 1]  // Left, Right
    ];
    
    function isWalkable(r, c) {
        return r >= 0 && r < rows && c >= 0 && c < cols && map[r][c] !== 0;
    }

    function bfs(startRow, startCol) {
        const queue = [[startRow, startCol]];
        const section = [];
        visited[startRow][startCol] = true;

        while (queue.length) {
            const [r, c] = queue.shift();
            section.push([r, c]);

            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (isWalkable(nr, nc) && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    queue.push([nr, nc]);
                }
            }
        }

        return section;
    }

    const isolatedSections = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (isWalkable(r, c) && !visited[r][c]) {
                const section = bfs(r, c);
                if (isIsolated(section)) {
                    isolatedSections.push(section);
                }
            }
        }
    }

    function isIsolated(section) {
        const seenEdges = new Set();
        for (const [r, c] of section) {
            for (const [dr, dc] of directions) {
                const nr = r + dr;
                const nc = c + dc;
                if (!isWalkable(nr, nc)) {
                    seenEdges.add(`${r},${c}`);
                }
            }
        }
        return section.length === seenEdges.size;
    }

    return isolatedSections;
}




export function find_my_isolated_section(isolated, x, y) {
    for (let i = 0; i < isolated.length; i++) {
        for (let j = 0; j < isolated[i].length; j++) {
            if (isolated[i][j][0] === x && isolated[i][j][1] === y) {
                return isolated[i];
            }
        }
    }
    return [];
}


// extra
export function parseArgs(argv) {
    const args = {};
    argv.forEach((arg, index) => {
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const value = argv[index + 1] && !argv[index + 1].startsWith('--') ? argv[index + 1] : true;
            args[key] = value;
        }
    });
    return args;
}
