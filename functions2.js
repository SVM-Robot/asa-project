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

const map = [
    [2, 1, 1, 1, 0, 2, 0, 1, 1, 2],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [1, 1, 1, 1, 0, 1, 0, 1, 1, 1],
    [2, 1, 1, 1, 0, 2, 0, 1, 1, 2]
]

//console.log(findIsolatedSections(map));
