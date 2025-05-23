const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

class ChatService {
  constructor() {
    this.connectedUsers = new Map(); // Map to store connected users and their socket connections
    this.sessionRooms = new Map(); // Map to store session rooms
  }

  /**
   * Initialize WebSocket server
   */
  init(io) {
    this.io = io;

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (data) => {
        try {
          const { token, sessionId } = data;
          
          if (!token || !sessionId) {
            socket.emit('error', { message: 'Token dan sessionId diperlukan' });
            return;
          }

          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.id;

          // Check if user has access to this session
          const session = await prisma.counselingSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: {
              counselor: true,
              users: true
            }
          });

          if (!session) {
            socket.emit('error', { message: 'Session tidak ditemukan' });
            return;
          }

          // Check if user is either the client or the counselor
          const isClient = session.userId === userId;
          const isCounselor = session.counselor.userId === userId;

          if (!isClient && !isCounselor) {
            socket.emit('error', { message: 'Tidak memiliki akses ke session ini' });
            return;
          }

          // Check if session is active
          if (session.status !== 'ACTIVE') {
            socket.emit('error', { 
              message: `Session belum aktif. Status: ${session.status}`,
              sessionStatus: session.status
            });
            return;
          }

          // Store user info in socket
          socket.userId = userId;
          socket.sessionId = parseInt(sessionId);
          socket.userRole = isClient ? 'client' : 'counselor';

          // Add user to connected users
          this.connectedUsers.set(socket.id, {
            userId,
            sessionId: parseInt(sessionId),
            role: socket.userRole,
            socket
          });

          // Join session room
          const roomName = `session_${sessionId}`;
          socket.join(roomName);

          // Add session to rooms if not exists
          if (!this.sessionRooms.has(parseInt(sessionId))) {
            this.sessionRooms.set(parseInt(sessionId), new Set());
          }
          this.sessionRooms.get(parseInt(sessionId)).add(socket.id);

          // Send authentication success
          socket.emit('authenticated', {
            message: 'Berhasil terhubung ke session',
            sessionId: parseInt(sessionId),
            role: socket.userRole
          });

          // Notify other users in the session
          socket.to(roomName).emit('user_joined', {
            userId,
            role: socket.userRole,
            message: `${socket.userRole === 'client' ? 'Klien' : 'Konselor'} telah bergabung`
          });

          console.log(`User ${userId} (${socket.userRole}) joined session ${sessionId}`);

        } catch (error) {
          console.error('Authentication error:', error);
          socket.emit('error', { 
            message: 'Gagal autentikasi', 
            details: error.message 
          });
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          if (!socket.userId || !socket.sessionId) {
            socket.emit('error', { message: 'Belum teautentikasi' });
            return;
          }

          const { message, type = 'text' } = data;

          if (!message || message.trim() === '') {
            socket.emit('error', { message: 'Pesan tidak boleh kosong' });
            return;
          }

          // Save message to database
          const chatMessage = await prisma.chatMessage.create({
            data: {
              sessionId: socket.sessionId,
              senderId: socket.userId,
              message: message.trim()
            },
            include: {
              users: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePicture: true
                }
              }
            }
          });

          // Send message to all users in the session
          const roomName = `session_${socket.sessionId}`;
          this.io.to(roomName).emit('new_message', {
            id: chatMessage.id,
            message: chatMessage.message,
            sentAt: chatMessage.sentAt,
            sender: {
              id: chatMessage.users.id,
              name: chatMessage.users.firstName + ' ' + chatMessage.users.lastName,
              profileImage: chatMessage.users.profilePicture,
              role: socket.userRole
            }
          });

          console.log(`Message sent in session ${socket.sessionId} by user ${socket.userId}`);

        } catch (error) {
          console.error('Send message error:', error);
          socket.emit('error', { 
            message: 'Gagal mengirim pesan', 
            details: error.message 
          });
        }
      });

      // Handle typing indicators
      socket.on('typing_start', () => {
        if (socket.sessionId) {
          const roomName = `session_${socket.sessionId}`;
          socket.to(roomName).emit('user_typing', {
            userId: socket.userId,
            role: socket.userRole,
            isTyping: true
          });
        }
      });

      socket.on('typing_stop', () => {
        if (socket.sessionId) {
          const roomName = `session_${socket.sessionId}`;
          socket.to(roomName).emit('user_typing', {
            userId: socket.userId,
            role: socket.userRole,
            isTyping: false
          });
        }
      });

      // Handle session completion (only for counselors)
      socket.on('complete_session', async (data) => {
        try {
          if (!socket.userId || socket.userRole !== 'counselor') {
            socket.emit('error', { message: 'Hanya konselor yang bisa menyelesaikan session' });
            return;
          }

          const { response } = data;

          if (!response || response.trim() === '') {
            socket.emit('error', { message: 'Response konselor diperlukan' });
            return;
          }

          // Update session status and add counselor response
          const updatedSession = await prisma.counselingSession.update({
            where: { id: socket.sessionId },
            data: {
              status: 'COMPLETED',
              response: response.trim()
            }
          });

          // Notify all users in the session
          const roomName = `session_${socket.sessionId}`;
          this.io.to(roomName).emit('session_completed', {
            message: 'Session telah diselesaikan oleh konselor',
            response: response.trim(),
            completedAt: new Date()
          });

          console.log(`Session ${socket.sessionId} completed by counselor ${socket.userId}`);

        } catch (error) {
          console.error('Complete session error:', error);
          socket.emit('error', { 
            message: 'Gagal menyelesaikan session', 
            details: error.message 
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle user disconnection
   */
  handleDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);

    // Remove from connected users
    const userInfo = this.connectedUsers.get(socket.id);
    if (userInfo) {
      const { sessionId, role } = userInfo;
      
      // Remove from session room
      if (this.sessionRooms.has(sessionId)) {
        this.sessionRooms.get(sessionId).delete(socket.id);
        
        // If room is empty, remove it
        if (this.sessionRooms.get(sessionId).size === 0) {
          this.sessionRooms.delete(sessionId);
        }
      }

      // Notify other users in the session
      const roomName = `session_${sessionId}`;
      socket.to(roomName).emit('user_left', {
        userId: socket.userId,
        role: role,
        message: `${role === 'client' ? 'Klien' : 'Konselor'} telah keluar`
      });
    }

    this.connectedUsers.delete(socket.id);
  }

  /**
   * Get active users in a session
   */
  getActiveUsersInSession(sessionId) {
    const activeUsers = [];
    
    if (this.sessionRooms.has(sessionId)) {
      for (const socketId of this.sessionRooms.get(sessionId)) {
        const userInfo = this.connectedUsers.get(socketId);
        if (userInfo) {
          activeUsers.push({
            userId: userInfo.userId,
            role: userInfo.role
          });
        }
      }
    }
    
    return activeUsers;
  }

  /**
   * Send notification to specific session
   */
  sendNotificationToSession(sessionId, notification) {
    const roomName = `session_${sessionId}`;
    this.io.to(roomName).emit('notification', notification);
  }
}

module.exports = new ChatService(); 