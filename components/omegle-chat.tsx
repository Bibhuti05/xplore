"use client";

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

const OmegleChat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInitializer = async () => {
      await fetch('/api/socket');
      socket = io({
        path: '/api/socket_io',
      });

      socket.on('connect', () => {
        console.log('Connected to socket.io server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from socket.io server');
        setIsConnected(false);
      });

      socket.on('message', (msg: string) => {
        setMessages((prevMessages) => [...prevMessages, msg]);
      });
    };

    socketInitializer();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const sendMessage = () => {
    if (socket && message.trim()) {
      socket.emit('message', message);
      setMessage('');
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Omegle Chat</h1>
      <p className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </p>
      <div className="flex-grow border rounded-lg p-4 mb-4 overflow-y-auto bg-gray-100 dark:bg-gray-800">
        {messages.map((msg, index) => (
          <div key={index} className="mb-2">
            {msg}
          </div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Type your message..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default OmegleChat;