import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { onlineSolver, PddlExecutor, PddlProblem, Beliefset, PddlDomain, PddlAction } from "@unitn-asa/pddl-client";

//import { default as config } from "./config.js";
//const client = new DeliverooApi( config.host, config.token )

//  a requirement for the project is to integrate some planner


// emerging from the challenge:
// - is spawnable? something about parcels always spawning in same place
// - condizione se altro agente è troppo vicino, da levare?
// - collisions if path is size=1?


const client = new DeliverooApi(

    //'https://deliveroojs3.onrender.com/',

    //'http://rtibdi.disi.unitn.it:8080',
    //'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijc1M2EzMjhmYTg0IiwibmFtZSI6IlNWTS1Sb2JvdCIsImlhdCI6MTcxNTY3OTgzM30.ArlxYLnx3TQP9sYbSlimeK8VWaEPjM3BqpseiKPeHoo'


    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJiNWJiNWEyYjA3IiwibmFtZSI6IlNWTSIsImlhdCI6MTcxMjY0OTM2NH0.trqXmE29PmO4AVgVWWZjSrxj4CqLS1pqk3aQnnSsl-4'
)
function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}


function nearestDelivery0({x, y}) {
    return Array.from( map.tiles.values() ).filter( ({delivery}) => delivery ).sort( (a,b) => distance(a,{x, y})-distance(b,{x, y}))[1]
}

function nearestDelivery(x4, y4) {
    const delivs = Array.from( map.tiles.values() ).filter( ({delivery}) => delivery )
    const distances = []
    for (const d of delivs){   
        distances.push(distance( {x:d.x, y:d.y}, {x:x4, y:y4}))
    }
    const minDistanceIndex = distances.indexOf(Math.min(...distances));
    return delivs[minDistanceIndex];
    //return [delivs[minDistanceIndex].x,delivs[minDistanceIndex].x];
}



/**Beliefset revision function*/

const map = {
    width:undefined,
    height:undefined,
    tiles: new Map(),
    add: function ( tile ) {
        const {x, y} = tile;
        return this.tiles.set( x+1000*y, tile );
    },
    xy: function (x, y) {
        return this.tiles.get( x+1000*y )
    }
};


client.onMap( (width, height, tiles) => {
    map.width = width;
    map.height = height;
    for (const t of tiles) {
        map.add( t );
    }
} )

client.onTile( (x, y, delivery) => {
    map.add( {x, y, delivery} );
} )

client.onNotTile( ( x, y ) => { 
    map.add( {x, y, blocked: true} );
} )



//const me = {};
const me = { carrying: new Map() };
client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )

var AGENTS_OBSERVATION_DISTANCE
var PARCELS_OBSERVATION_DISTANCE
var MOVEMENT_DURATION
var PARCEL_DECADING_INTERVAL

client.onConfig( (config) => {
    AGENTS_OBSERVATION_DISTANCE = config.AGENTS_OBSERVATION_DISTANCE;
    PARCELS_OBSERVATION_DISTANCE = config.PARCELS_OBSERVATION_DISTANCE;
    MOVEMENT_DURATION = config.MOVEMENT_DURATION;
    PARCEL_DECADING_INTERVAL = config.PARCEL_DECADING_INTERVAL//== '1s' ? 1000 : 1000000;
} );

if (PARCEL_DECADING_INTERVAL != 'infinite2'){
    console.log('PARCEL_DECADING_INTERVAL:',PARCEL_DECADING_INTERVAL)
}

const agents = new Map();
client.onAgentsSensing( ( sensed_agents ) => {
    for ( const {id, name, x, y, score} of sensed_agents ) {
        agents.set(id, {id, x, y} );
    }
    for ( const [id, {x, y}] of agents.entries() ) {
        if ( distance (me, {x, y}) < AGENTS_OBSERVATION_DISTANCE && ! sensed_agents.find( (sensed) => id == sensed.id ) )
        agents.delete(id);
    }
} );


const parcels = new Map();
client.onParcelsSensing( async ( perceived_parcels ) => {
    let new_parcel_sensed = false;
    for (const p of perceived_parcels) {
        if ( ! parcels.has(p.id) )
            new_parcel_sensed = true;
        parcels.set( p.id, p)
        if ( p.carriedBy == me.id ) {
            me.carrying.set( p.id, p );
        }
    }
    for ( const [id,p] of parcels.entries() ) {
        if ( ! perceived_parcels.find( p=>p.id==id ) ) {
            parcels.delete( id ); 
            me.carrying.delete( id );
        }
    }
} )

//client.onConfig( (param) => {
    // console.log(param);
//} )

/** Options generation and filtering function */
var reset1 = true;

client.onParcelsSensing( parcels => {
    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed
    /**Options generation*/
    

    const options = []
    for (const parcel of parcels.values()) {

        const d5 = []
        for (const a of agents){
            d5.push(distance({x:parcel.x,y:parcel.y},{x:a[1].x,y:a[1].y}))
        }
        if ( ! parcel.carriedBy && distance({x:parcel.x,y:parcel.y},{x:me.x,y:me.y}) <= Math.min(...d5)) {
            options.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id]);
        }
    }

    /** Options filtering*/
    let best_option;
    let nearest = Number.MAX_VALUE;
    for (const option of options) {
        if ( option[0] == 'go_pick_up' ) {
            let [go_pick_up,x,y,id] = option;
            let current_d = distance( {x, y}, me )
            if ( current_d < nearest ) {
                best_option = option
                nearest = current_d
            }
        }
    }

    /** Best option is selected*/
    if ( best_option ){
        reset1 = true;
        myAgent.push( best_option );
    }
    else if (reset1){

        reset1 = false;

        if (me.carrying.size > 0){
            myAgent.push( ['deliv1', nearestDelivery(me.x,me.y).x, nearestDelivery(me.x,me.y).y])
        }
        else myAgent.push( ['expl_rand', me.x, me.y]);
        //else myAgent.push( ['expl3', me.x, me.y]);
    }
    else {
        reset1 = true;
    }
} )

const beliefset = new Map();

//client.onAgentsSensing( callb => {console.log('agent sensing')})
//client.onYou( agentLoop )



/** Intention revision loop */
class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue () {
        return this.#intention_queue;
    }

    async loop ( ) {
        while ( true ) {
            // Consumes intention_queue if not empty
            if ( this.intention_queue.length > 0 ) {
                console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
            
                // Current intention
                const intention = this.intention_queue[0];
                
                // Is queued intention still valid? Do I still want to achieve it?
                let id = intention.predicate[2]
                let p = parcels.get(id)
                if ( p && p.carriedBy ) {
                    console.log( 'Skipping intention because no more valid', intention.predicate )
                    continue;
                }

                // Start achieving intention
                await intention.achieve()
                // Catch eventual error and continue
                .catch( error => {
                    // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                } );
                // Remove from the queue
                this.intention_queue.shift();
            }
            // Postpone next iteration at setImmediate
            await new Promise( res => setImmediate( res ) );
        }
    }

    // async push ( predicate ) { }
    log ( ...args ) {
        console.log( ...args )
    }
}

class IntentionRevisionQueue extends IntentionRevision {

    async push ( predicate ) {
        // Check if already queued
        if ( this.intention_queue.find( (i) => i.predicate.join(' ') == predicate.join(' ') ) )
            return; // intention is already queued

        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate );
        this.intention_queue.push( intention );
    }
}

class IntentionRevisionReplace extends IntentionRevision {

    async push ( predicate ) {

        // Check if already queued
        const last = this.intention_queue.at( this.intention_queue.length - 1 );
        if ( last && last.predicate.join(' ') == predicate.join(' ') ) {
            return; // intention is already being achieved
        }
        
        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate );
        this.intention_queue.push( intention );
        
        // Force current intention stop 
        if ( last ) {
            last.stop();
        }
    }
}

class IntentionRevisionRevise extends IntentionRevision {

    async push ( predicate ) {
        console.log( 'Revising intention queue. Received', ...predicate );
        // TODO
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention
    }

}

/**Start intention revision loop*/

// const myAgent = new IntentionRevisionQueue();
const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();
myAgent.loop();



/**Intention*/
class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;
    // This is used to stop the intention
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }
    stop () {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if ( this.#current_plan)
            this.#current_plan.stop();
    }
    /**#parent refers to caller*/
    #parent;
    /** predicate is in the form ['go_to', x, y]*/
    get predicate () {
        return this.#predicate;
    }
    #predicate;

    constructor ( parent, predicate ) {
        this.#parent = parent;
        this.#predicate = predicate;
    }

    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    #started = false;
    /*** Using the plan library to achieve an intention*/
    async achieve () {
        // Cannot start twice
        if ( this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of planLibrary) {

            // if stopped then quit
            if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];
            // if plan is 'statically' applicable
            if ( planClass.isApplicableTo( ...this.predicate ) ) {
                // plan is instantiated
                this.#current_plan = new planClass(this.parent);
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    const plan_res = await this.#current_plan.execute( ...this.predicate );
                    this.log( 'succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', ...this.predicate,'with plan', planClass.name, 'with error:', ...error );
                }
            }
        }
        // if stopped then quit
        if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];
        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        reset1 = true;
        this.#current_plan.stop();;
        throw ['no plan satisfied the intention ', ...this.predicate ];
        
    }

}

/** Plan library */
const planLibrary = [];
class Plan {
    // This is used to stop the plan
    #stopped = false;
    stop () {
        // this.log( 'stop plan' );
        this.#stopped = true;
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }
    get stopped () {
        return this.#stopped;
    }
    /*** #parent refers to caller*/
    #parent;
    constructor ( parent ) {
        this.#parent = parent;
    }
    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }
    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    #sub_intentions = [];
    async subIntention ( predicate ) {
        const sub_intention = new Intention( this, predicate );
        this.#sub_intentions.push( sub_intention );
        return await sub_intention.achieve();
    }
}


class GoPickUp extends Plan {

    static isApplicableTo ( go_pick_up, x, y, id ) {
        return go_pick_up == 'go_pick_up';
    }
    async execute ( go_pick_up, x, y ) {
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await this.subIntention( ['go_to', x, y] );
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        return true;
    }
}

class GoDeliver extends Plan {

    static isApplicableTo ( go_pick_up, x, y,) {
        return go_pick_up == 'deliv1';
    }
    async execute ( go_pick_up, x, y ) {
        if ( this.stopped ) {reset1=true; throw ['stopped'];}
        await this.subIntention( ['go_to', x, y] );
        await client.putdown();
        if ( this.stopped ) {reset1=true; throw ['stopped'];}
        reset1=true;
        return true;
    }
}


class BlindMove extends Plan {

    static isApplicableTo ( go_to, x, y ) {
        return go_to == 'go_to';
    }
    async execute ( go_to, x, y ) {
        while ( me.x != x || me.y != y ) {
            if ( this.stopped ) throw ['stopped']; // if stopped then quit
            let status_x = false;
            let status_y = false; 
            // this.log('me', me, 'xy', x, y);
            if ( x > me.x ){
                status_x = await client.move('right');
            }
                // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if ( x < me.x ){
                status_x = await client.move('left');   
            }      
                // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );
            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }
            if ( this.stopped ) throw ['stopped']; // if stopped then quit
            if ( y > me.y )
                status_y = await client.move('up')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if ( y < me.y )
                status_y = await client.move('down')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );
            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }      
            if ( ! status_x && ! status_y) {
                //this.log('stucked');
                await this.backtrack();
                //throw 'stucked';
            } else if ( me.x == x && me.y == y ) {
                // this.log('target reached');
            }          
        }
        return true;
    }
    async backtrack() {
        console.log('BACKTRACKING')
        for (let i = 0; i < 10; i++) {
            const d = ['right', 'left', 'up', 'down'][Math.floor(Math.random() * 4)];
            await client.move(d);
          }

        // Continue with the original path
        await this.execute(go_to, x, y);
    }

}

class ExplRandom extends Plan {

    static isApplicableTo ( expl_rand, x, y, id ) {
        return expl_rand == 'expl_rand';
    }
    async execute ( go_pick_up, x, y ) {
        var x_r = Math.floor(Math.random() * (map.width-1 - 0 + 1)) + 0;
        var y_r = Math.floor(Math.random() * (map.height-1 - 0 + 1)) + 0;
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await this.subIntention( ['go_to', x_r, y_r] );
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        return true;
    }
}

class ExplFar3 extends Plan {

    static isApplicableTo ( expl3, xm, ym ) {
        return expl3 == 'expl3';
    }
    
    async execute ( go_pick_up, xm, ym ) {

        var c_xmax = map.width-1;
        var c_ymax = map.height-1;
        var values6 = {
        c1 : distance( {x:0, y:0}, {x:xm, y:ym}),
        c2 : distance( {x:0, y:c_ymax}, {x:xm, y:ym} ),
        c3 : distance( {x:c_xmax, y:0}, {x:xm, y:ym} ),
        c4 : distance( {x:c_xmax, y:c_ymax}, {x:xm, y:ym} )
        }
        const maxValueName = Object.keys(values6).reduce((maxName, currentName) => {
             return values6[maxName] > values6[currentName] ? maxName : currentName;
             }, '');   
        var values7 = {
        c1 : [0,0],
        c2 : [0,c_ymax],
        c3 : [c_xmax,0],
        c4 : [c_xmax,c_ymax]
        }
        var x2 = values7[maxValueName][0];
        var y2 = values7[maxValueName][1];

        if ( this.stopped ) {reset1=true; throw ['stopped'];} // if stopped then quit
        await this.subIntention( ['go_to', x2, y2] );
        await client.putdown();
        if ( this.stopped ) {reset1=true; throw ['stopped'];} // if stopped then quit
        reset1 = true;
        prev_expl_p = [xm,ym]
        return true;
    }
    //async execute ( go_to, x, y ) {await client.move('right')}
}



class RandomMove extends Plan {
    static isApplicableTo ( random1) {
        return random1 == 'random1';
    }
    async execute () {
        let tried = [];
        var previous = 'right';
        while ( tried.length < 4 ) {
            let current = { up: 'down', right: 'left', down: 'up', left: 'right' }[previous] // backward
            if ( tried.length < 3 ) { // try haed or turn (before going backward)
                //current = [ 'up', 'right', 'down', 'left' ].filter( d => d != current )[ Math.floor(Math.random()*3) ];
                current = [ 'up', 'right', 'down', 'left' ][ Math.floor(Math.random()*4) ];
                //this way it goes full randomS
            }
            if ( ! tried.includes(current) ) {  
                if ( await client.move( current ) ) {
                    console.log( 'moved', current );
                    previous = current;
                    break; // moved, continue
                }   
                tried.push( current );   
            }  
        }
        if ( tried.length == 4 ) {
            console.log( 'stucked' );
            await client.timer(1000); // stucked, wait 1 sec and retry
        } 
        return true;
    }
}


// plan classes are added to plan library 
planLibrary.push( GoPickUp )
planLibrary.push( BlindMove )
planLibrary.push( RandomMove )
planLibrary.push( GoDeliver )
planLibrary.push( ExplFar3 )
planLibrary.push( ExplRandom )

