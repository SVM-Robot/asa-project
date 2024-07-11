Project folder description:


ag1.js is the single agent, ag2_1.js and ag2_2.js are the two multi-agents, but they are tied together by the ag3.js script that is the one running. 

The last two files are the domain-d.ppdl, used in the PDDL planner, and a file with some functions used by the agents. 

Some of the agents’ behavior can be changed with some flag variables at the beginning of the files.
const when_idle = 1; 
const multi_agents = 1;
var split_map = 1;
const use_pddl = 1;
