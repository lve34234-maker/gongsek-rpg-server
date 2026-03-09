const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

require('./db').initDB();
app.use('/api/auth', require('./auth'));
app.use('/api/user', require('./user'));
app.use('/api/admin', require('./admin'));

app.get('/', (req, res) => res.json({ status: 'ok', game: '공책RPG' }));

// HTTP 서버 생성 (WebSocket 공유용)
const server = createServer(app);

// ── WebSocket 멀티플레이어 ──
const wss = new WebSocketServer({ server });
const players = {}; // world → { username → playerData }

function broadcast(world, data, excludeWs=null){
  if(!players[world])return;
  const msg=JSON.stringify(data);
  Object.values(players[world]).forEach(p=>{
    if(p.ws!==excludeWs&&p.ws.readyState===1)p.ws.send(msg);
  });
}

wss.on('connection',(ws)=>{
  let username=null,world=null;

  ws.on('message',(raw)=>{
    let d;try{d=JSON.parse(raw);}catch{return;}

    if(d.type==='join'){
      username=d.username;world=d.world||'forest';
      if(!players[world])players[world]={};
      players[world][username]={ws,username,world,x:d.x||3,z:d.z||3,
        classId:d.classId||'warrior',charName:d.charName||username,
        hp:d.hp||100,maxHp:d.maxHp||100,face:d.face||1,fx:1,fy:0,lv:d.lv||1};
      const others=Object.values(players[world]).filter(p=>p.username!==username)
        .map(({username:u,x,z,classId,charName,hp,maxHp,face,fx,fy,lv})=>({username:u,x,z,classId,charName,hp,maxHp,face,fx,fy,lv}));
      ws.send(JSON.stringify({type:'init',players:others}));
      broadcast(world,{type:'join',username,x:d.x,z:d.z,classId:d.classId,charName:d.charName,hp:d.hp,maxHp:d.maxHp,face:d.face||1,fx:1,fy:0,lv:d.lv},ws);
    }
    else if(d.type==='move'&&username&&world){
      if(players[world]?.[username])Object.assign(players[world][username],{x:d.x,z:d.z,face:d.face,fx:d.fx,fy:d.fy});
      broadcast(world,{type:'move',username,x:d.x,z:d.z,face:d.face,fx:d.fx,fy:d.fy},ws);
    }
    else if(d.type==='attack'&&username&&world){
      broadcast(world,{type:'attack',username,x:d.x,z:d.z},ws);
    }
    else if(d.type==='worldChange'&&username){
      if(world&&players[world]?.[username]){delete players[world][username];broadcast(world,{type:'leave',username});}
      world=d.world;
      if(!players[world])players[world]={};
      players[world][username]={ws,username,world,x:d.x||3,z:d.z||3,classId:d.classId,charName:d.charName,hp:d.hp,maxHp:d.maxHp,face:1,fx:1,fy:0,lv:d.lv};
      const others=Object.values(players[world]).filter(p=>p.username!==username)
        .map(({username:u,x,z,classId,charName,hp,maxHp,face,fx,fy,lv})=>({username:u,x,z,classId,charName,hp,maxHp,face,fx,fy,lv}));
      ws.send(JSON.stringify({type:'init',players:others}));
      broadcast(world,{type:'join',username,x:d.x,z:d.z,classId:d.classId,charName:d.charName,hp:d.hp,maxHp:d.maxHp,face:1,fx:1,fy:0,lv:d.lv},ws);
    }
  });

  ws.on('close',()=>{
    if(username&&world&&players[world]?.[username]){
      delete players[world][username];
      broadcast(world,{type:'leave',username});
    }
  });
});

server.listen(PORT,()=>console.log(`Server+WS running on port ${PORT}`));
