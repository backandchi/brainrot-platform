import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
})
export class AppSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    // Client connected
  }

  handleDisconnect(client: Socket) {
    // Client disconnected
  }

  /**
   * Broadcasts a newly unboxed item to the Live Drops banner on all connected clients
   */
  broadcastLiveDrop(data: {
    username: string;
    avatarUrl?: string;
    caseName: string;
    itemName: string;
    itemImage: string;
    itemPrice: number;
    rarity: string;
    glowColor: string;
  }) {
    this.server.emit('live-drop', data);
  }

  @SubscribeMessage('join-battles')
  handleJoinBattles(client: Socket) {
    client.join('battles-lobby');
  }
}
