import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';
import { RxAvatar } from "react-icons/rx";


const API_KEY = "AIzaSyBv-B1bYeKkO3MZ3Kqpgwv0ximNUXG97Ws";
const genAI = new GoogleGenerativeAI(API_KEY);

const CONTEXTO_INICIAL = `você é um chatbot que ajuda as pessoas a encontrar e experimentar novas receitas culinárias, você poderia sugerir receitas baseadas nos ingredientes que a pessoa tem em casa, oferecer dicas de preparo, e até mesmo adaptar receitas para diferentes restrições alimentares ou preferências. Além disso, você poderia oferecer sugestões de harmonização de pratos e dicas para melhorar as habilidades culinárias. você não pode conversar sobre outros assuntos que não seja culinária, sempre pergunte se a pessoa tem alguma restrição alimentar e caso tenha, adeque a receita com base nas restrições. Seu nome será Mega Chef da Computaria.`;

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessageToGemini = async (message) => {
    try {
      console.log('Enviando mensagem para Gemini...');
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      let historicoConversa = '';
      
      const mensagensRecentes = messages.slice(-5);
      if (mensagensRecentes.length > 0) {
        historicoConversa = 'Histórico da conversa:\n';
        mensagensRecentes.forEach(msg => {
          historicoConversa += `${msg.isUser ? 'Usuário' : 'Assistente'}: ${msg.text}\n`;
        });
      }
      
      const promptComContexto = `${CONTEXTO_INICIAL}\n\n${historicoConversa}\nPergunta atual do usuário: ${message}`;
      
      const result = await model.generateContent(promptComContexto);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(userMessage);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: "Desculpe, ocorreu um erro ao processar sua mensagem. Verifique se sua chave API está configurada corretamente.", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
      <img alt="logo" src='/imagens/logo.png' className="avatar"/>
        <h1>Mega Chef da Computaria</h1>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="message bot">
            <img alt="logo" src='/imagens/logo.png' className="avatar"/>
            <div className="message-content">
              <ReactMarkdown>
              Olá! Sou o Mega Chef da Computaria, seu assistente culinário virtual, pronto para te ajudar com:

Sugestões de receitas com os ingredientes que você tem.

Dicas de preparo e truques para acertar no prato.

Adaptações conforme suas restrições ou preferências alimentares.

Harmonizações entre comidas e bebidas.

Segredos para melhorar suas habilidades na cozinha.

Foco total em culinária — não falo de outros assuntos.
Para começar, me conte se tem alguma restrição alimentar ou preferência, e o que tem disponível na sua despensa. Vamos cozinhar juntos... com dados!


              </ReactMarkdown>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
            <div className="avatar">
            {message.isUser ? <RxAvatar size={60}/> : <img alt="logo" className="avatar" src='/imagens/logo.png'/>}
            </div>
            <div className="message-content">
              <ReactMarkdown>
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">
            <img alt="logo" src='/imagens/logo.png' className="avatar"/>
            <div className="message-content">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Digite sua mensagem..."
          disabled={isLoading}
          rows={1}
        />
        <button 
          className="send-button" 
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;