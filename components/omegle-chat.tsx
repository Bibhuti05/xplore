"use client";

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

const OmegleChat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);

  useEffect(() => {
    const socketInitializer = async () => {
      // No need to fetch /api/socket anymore, as it's a pages/api route
      socket = io({
        path: '/api/socket_io',
      });

      socket.on('connect', () => {
        console.log('Connected to socket.io server');
        setIsConnected(true);
        socket.emit('findPartner'); // Request to find a partner
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from socket.io server');
        setIsConnected(false);
        setIsWaiting(false);
        setPartnerId(null);
      });

      socket.on('message', (msg: string) => {
        setMessages((prevMessages) => [...prevMessages, `Partner: ${msg}`]);
      });

      socket.on('waitingForPartner', () => {
        setIsWaiting(true);
        setPartnerId(null);
        setMessages((prevMessages) => [...prevMessages, 'You are waiting for a partner...']);
      });

      socket.on('partnerFound', (id: string) => {
        setIsWaiting(false);
        setPartnerId(id);
        setMessages((prevMessages) => [...prevMessages, `Partner found! You are chatting with ${id}`]);
      });

      socket.on('partnerDisconnected', () => {
        setMessages((prevMessages) => [...prevMessages, 'Your partner has disconnected. Finding a new partner...']);
        setPartnerId(null);
        socket.emit('findPartner'); // Try to find a new partner
      });

      socket.on('error', (errorMsg: string) => {
        console.error('Socket error:', errorMsg);
        setMessages((prevMessages) => [...prevMessages, `Error: ${errorMsg}`]);
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
    if (socket && message.trim() && partnerId) {
      socket.emit('message', message);
      setMessages((prevMessages) => [...prevMessages, `You: ${message}`]);
      setMessage('');
    } else if (!partnerId) {
      setMessages((prevMessages) => [...prevMessages, 'You need a partner to send messages.']);
    }
  };

  const findNewPartner = () => {
    if (socket && isConnected) {
      setMessages([]); // Clear messages when finding a new partner
      setPartnerId(null);
      setIsWaiting(true);
      socket.emit('findPartner');
    }
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Omegle Chat</h1>
      <p className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </p>
      {isWaiting && <p className="text-sm text-yellow-500">Waiting for a partner...</p>}
      {partnerId && <p className="text-sm text-blue-500">Chatting with: {partnerId}</p>}
      {!partnerId && !isWaiting && isConnected && (
        <button
          onClick={findNewPartner}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
        >
          Find New Partner
        </button>
      )}
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
          disabled={!partnerId} // Disable input if no partner
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={!partnerId} // Disable button if no partner
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default OmegleChat;