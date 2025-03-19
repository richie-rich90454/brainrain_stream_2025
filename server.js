// const express=require('express');
// const http=require('http');
// const WebSocket=require('ws');

// // Create an Express server
// const app=express();
// const server=http.createServer(app);

// // Serve the static HTML file
// app.use(express.static('public'));

// // Create WebSocket server for signaling
// const wss=new WebSocket.Server({ server });

// wss.on('connection', (ws)=>{
//   console.log('A client connected');
  
//   ws.on('message', (message)=>{
//     console.log('Received:', message);
    
//     // Broadcast the message to all clients except the sender
//     wss.clients.forEach(client=>{
//       if (client !== ws && client.readyState==WebSocket.OPEN){
//         client.send(message);
//       }
//     });
//   });

//   ws.on('close', ()=>{
//     console.log('A client disconnected');
//   });
// });

// // Start the server
// const port=2047;
// server.listen(port, ()=>{
//   console.log(`Server running at http://localhost:${port}`);
// });
const express=require('express');
const http=require('http');
const WebSocket=require('ws');
const app=express();
const server=http.createServer(app);
app.use(express.static('public'));
const wss=new WebSocket.Server({ server });
let host=null;
const participants=new Map();
let participantCounter=0;
wss.on('connection', (ws)=>{
    const participantId=`participant_${participantCounter++}`;
    console.log(`New connection: ${participantId}`);
    const assignRole=()=>{
        if (!host){
            host={ ws, id: participantId };
            participants.set(participantId, ws);
            ws.send(JSON.stringify({ 
                type: 'role', 
                role: 'host',
                participants: Array.from(participants.keys())
            }));
            console.log(`Assigned host role to ${participantId}`);
        }
        else{
            participants.set(participantId, ws);
            ws.send(JSON.stringify({ 
                type: 'role', 
                role: 'participant',
                hostId: host.id,
                participants: Array.from(participants.keys())
            }));
            broadcast({ 
                type: 'newParticipant', 
                participantId 
            }, participantId);
        }
    };
    ws.on('message', (message)=>{
        try{
            const data=JSON.parse(message);
            console.log(`Message from ${participantId}:`, data.type);
            switch(data.type){
                case 'join':
                    assignRole();
                    break;
                case 'offer':
                case 'answer':
                case 'ice-candidate':
                    if (data.target){
                        const target=participants.get(data.target) || host?.ws;
                        if (target && target.readyState==WebSocket.OPEN){
                            target.send(JSON.stringify({ 
                                ...data, 
                                senderId: participantId 
                            }));
                        }
                    }
                    break;
                default:
                    broadcast(data, participantId);
            }
        }
        catch (error){
            console.error('Error handling message:', error);
        }
    });
    ws.on('close', ()=>{
        console.log(`Disconnected: ${participantId}`);
        participants.delete(participantId);
        if (participantId==host?.id){
            console.log('Host disconnected, ending session');
            broadcast({ type: 'sessionEnd' });
            host=null;
            participants.clear();
        }
        else{
            broadcast({ 
                type: 'participantLeft', 
                participantId 
            }, participantId);
        }
    });
});
function broadcast(message, excludeId){
    const recipients=[
        ...participants.entries(),
        ...(host ? [[host.id, host.ws]] : [])
    ];
    recipients.forEach(([id, client])=>{
        if (id !== excludeId && client.readyState==WebSocket.OPEN){
            client.send(JSON.stringify(message));
        }
    });
}
const PORT=2047;
server.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});