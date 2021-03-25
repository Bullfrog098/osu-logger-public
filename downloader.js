const fs = require( "fs-extra" );
var Git = require( "nodegit" );
const https = require( "https" );
const open = require( "open" );
const prompts = require( "prompts" );
const readline = require( "readline" );
var path = "./dotnet-sdk-3.1.407-win-x64.exe";
var url = "https://download.visualstudio.microsoft.com/download/pr/a45c8c1c-6466-4afc-a266-bd540069a4a6/97293f1080615bba5572ad1ef3be254c/dotnet-sdk-3.1.407-win-x64.exe";
if ( fs.existsSync( "./tmp" ) ) fs.emptyDirSync( "./tmp" );

questions();

async function questions(){
	const response = await prompts( [
		{
			type: "select",
			name: "file",
			message: "Choose what to run",
			choices: [
				{ title: "First time install", value: "firsttime" },
				{ title: "osu-tools update", value: "update" },
				{ title: "cancel", value: "cancel" }
			],
		}
	] );
	if ( response.file === "cancel" ) return process.exit();
	else if ( response.file === "firsttime" ) return start( true ); 
	else return ppmaker( false ); 
}


function start( first ){
	if ( fs.existsSync( path ) ) return ppmaker( first );

	https.get( url,( res ) => {
		const filePath = fs.createWriteStream( path );
		res.pipe( filePath );
		filePath.on( "finish", async () => {
			filePath.close();
			console.log( "Download Completed" ); 
			ppmaker( first );
		} );
	} );
}

async function ppmaker( first ){
	if ( first === true ) await open( path, { wait: true } );
	var e = await downloadosutools();
	if ( e === false ){ 
		return readline.createInterface( process.stdin, process.stdout ).question( "Already up to date! Press [enter] to exit", function(){
			if ( fs.existsSync( path ) ) fs.unlinkSync( path );
			process.exit();
		} );
		
	}
	exec( "dotnet run --project osu-tools\\PerformanceCalculator", ( result ) =>{
		var done = true;
		if( result.toString().includes( "command \"dotnet run --project osu-tools\\PerformanceCalculator\" exited with wrong status code" ) ) done = false;
		readline.createInterface( process.stdin, process.stdout ).question( done ? "\nAll Done! Press [enter] to exit":"\nRunning the command failed! Try again and make sure to install dotnet.\nPress [enter] to exit", function(){
			if ( done === true && first === true ) fs.unlinkSync( path );
			process.exit();
		} );
	} );
}

function downloadosutools(){
	return new Promise ( async ( resolve ) => {
		var a = await Git.Clone( "https://github.com/ppy/osu-tools", "./tmp/osu-tools" );
		var b = await a.getHeadCommit( );
		var onlinehash = await b.sha();
		if ( fs.existsSync( "./osu-tools" ) ){
			var c = await Git.Repository.open( "osu-tools" );
			var d = await c.getHeadCommit();
			var localhash = await d.sha();
			if ( localhash === onlinehash ) return resolve( false );
		}
		await fs.rmdirSync( "./osu-tools", { recursive: true } );
		await fs.copySync( "./tmp/osu-tools", "./osu-tools" );
		await fs.rmdirSync( "./tmp", { recursive: true } );
		return resolve();
	} );
}

function exec( cmd, cb ){
	try{
		var child_process = require( "child_process" );
		var parts = cmd.split( /\s+/g );
		var p = child_process.spawn( parts[0], parts.slice( 1 ), { stdio: "inherit" } );
		p.on( "exit", function( code ){
			var err = "allgood";
			if ( code ) {
				err = new Error( "command \""+ cmd +"\" exited with wrong status code \""+ code +"\"" );
				err.code = code;
				err.cmd = cmd;
			}
			if ( cb ) cb( err );
		} );
	} catch ( e ) {
		return console.log( e );
	}
}


