// Minimal synthetic read-only MCP stdio server. No production integrations.
import readline from 'node:readline';
import fs from 'node:fs';
import {contract,examples} from './fixture.mjs';
const log=process.argv[2];
const specs=[['get_contract','Get the frozen JSONL job-planner requirements.'],['get_examples','Get synthetic reference cases and collision/ordering hints.']];
const tools=specs.map(([name,description])=>({name,description,inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}}));
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
for await(const line of readline.createInterface({input:process.stdin,crlfDelay:Infinity})){
 let req;try{req=JSON.parse(line)}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue}
 if(req.id===undefined)continue;
 let result,error;
 if(req.method==='initialize')result={protocolVersion:'2025-06-18',capabilities:{tools:{listChanged:false}},serverInfo:{name:'open-lm-synthetic-benchdata',version:'0.0.0'}};
 else if(req.method==='ping')result={};
 else if(req.method==='tools/list')result={tools};
 else if(req.method==='resources/list')result={resources:[]};
 else if(req.method==='resources/templates/list')result={resourceTemplates:[]};
 else if(req.method==='tools/call'){
 const name=req.params?.name,args=req.params?.arguments??{};
 if(!specs.some(x=>x[0]===name)||!args||Array.isArray(args)||typeof args!=='object'||Object.keys(args).length)error={code:-32602,message:'Unknown tool or invalid arguments'};
 else {result={content:[{type:'text',text:name==='get_contract'?contract:JSON.stringify(examples)}]};if(log)fs.appendFileSync(log,JSON.stringify({time:new Date().toISOString(),name})+'\n',{mode:0o600});}
 }else error={code:-32601,message:'Method not found'};
 send({jsonrpc:'2.0',id:req.id,...(error?{error}:{result})});
}
