import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import './Chatbot.css';
import { RxAvatar } from "react-icons/rx";
import { FiSend, FiAlertCircle } from "react-icons/fi";

// Usando variável de ambiente para API key
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || "AIzaSyBv-B1bYeKkO3MZ3Kqpgwv0ximNUXG97Ws";

// Constantes para configuração
const MODELO_IA = "gemini-2.0-flash";
const MAX_HISTORICO = 10; // Manter histórico maior para melhor contexto
const MENSAGEM_ERRO_API = "Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.";
const MENSAGEM_ERRO_REDE = "Parece que você está offline. Verifique sua conexão e tente novamente.";
const STORAGE_KEY = "megaChef_conversationHistory"; // Chave para armazenar no localStorage

const CONTEXTO_INICIAL = `você é um chatbot que ajuda as pessoas a encontrar e experimentar novas receitas culinárias, você poderia sugerir receitas baseadas nos ingredientes que a pessoa tem em casa, oferecer dicas de preparo, e até mesmo adaptar receitas para diferentes restrições alimentares ou preferências. Além disso, você poderia oferecer sugestões de harmonização de pratos e dicas para melhorar as habilidades culinárias. você não pode conversar sobre outros assuntos que não seja culinária, sempre pergunte se a pessoa tem alguma restrição alimentar e caso tenha, adeque a receita com base nas restrições. Seu nome será Mega Chef da Computaria.`;

const MENSAGEM_BOAS_VINDAS = `Olá! Sou o Mega Chef da Computaria, seu assistente culinário virtual, pronto para te ajudar com:

- Sugestões de receitas com os ingredientes que você tem.
- Dicas de preparo e truques para acertar no prato.
- Adaptações conforme suas restrições ou preferências alimentares.
- Harmonizações entre comidas e bebidas.
- Segredos para melhorar suas habilidades na cozinha.

Foco total em culinária — não falo de outros assuntos.
Para começar, me conte se tem alguma restrição alimentar ou preferência, e o que tem disponível na sua despensa. Vamos cozinhar juntos... com dados!`;

const Chatbot = () => {
  // Estado para armazenar mensagens, entrada, carregamento e erros
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [genAI, setGenAI] = useState(null);
  
  // Referências para auto-rolagem
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  // Carregar mensagens do localStorage quando o componente montar
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens salvas:', error);
    }
  }, []);
  
  // Salvar mensagens no localStorage sempre que o estado messages mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Erro ao salvar mensagens:', error);
    }
  }, [messages]);
  
  // Auto-ajuste da altura do textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };
  
  // Inicializar API Gemini quando o componente montar
  useEffect(() => {
    try {
      setGenAI(new GoogleGenerativeAI(API_KEY));
    } catch (error) {
      console.error('Erro ao inicializar a API Gemini:', error);
      setError('Falha ao inicializar o chatbot. Verifique a configuração da API.');
    }
  }, []);

  // Rolagem automática para a mensagem mais recente
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Ajustar altura do textarea quando o input muda
  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  // Verificar conexão de rede
  const isOnline = () => {
    return navigator.onLine;
  };

  // Função para enviar mensagem para a API do Gemini
  const sendMessageToGemini = async (message) => {
    if (!isOnline()) {
      throw new Error(MENSAGEM_ERRO_REDE);
    }
    
    if (!genAI) {
      throw new Error("API Gemini não inicializada corretamente.");
    }
    
    try {
      console.log('Enviando mensagem para Gemini...');
      const model = genAI.getGenerativeModel({ model: MODELO_IA });
      
      // Preparar histórico de conversa para contexto
      let historicoConversa = '';
      
      // Usar mais mensagens para melhor contexto
      const mensagensRecentes = messages.slice(-MAX_HISTORICO);
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

  // Função para limpar a conversa
  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    // Limpar também do localStorage
    localStorage.removeItem(STORAGE_KEY);
  };

  // Função para enviar mensagem
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    // Resetar a altura do textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await sendMessageToGemini(userMessage);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      console.error('Erro capturado:', error);
      setError(error.message || MENSAGEM_ERRO_API);
      // Não adicionar mensagem de erro ao histórico de conversa
    } finally {
      setIsLoading(false);
    }
  };

  // Manipular teclas pressionadas
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
        <button 
          className="clear-button" 
          onClick={handleClearChat}
          title="Limpar conversa"
        >
          Limpar
        </button>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="message bot">
            <img alt="logo" src='/imagens/logo.png' className="avatar"/>
            <div className="message-content">
              <ReactMarkdown>
                {MENSAGEM_BOAS_VINDAS}
              </ReactMarkdown>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.isUser ? 'user' : 'bot'}`}>
            <div className="avatar">
              {message.isUser ? <RxAvatar size={30}/> : <img alt="logo" className="avatar" src='/imagens/logo.png'/>}
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
        
        {error && (
          <div className="error-message">
            <FiAlertCircle className="error-icon" />
            <p>{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          ref={textareaRef}
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
          aria-label="Enviar mensagem"
        >
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <FiSend size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

export default Chatbot;