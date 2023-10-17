import React, { useState, useEffect, useRef } from 'react';
import Api from '../src/components/Api.js';
import Validator from './components/Validator.js';
import Calendar from './components/Calendar.js';
import { useSession, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';
const App = () => {
  const supabase = useSupabaseClient();
  const session = useSession(); 
  const messagesContainerRef = useRef(null);

  const [isLoading, setIsLoading] = useState(false);
  const scrollToBottom = () => {
    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  };

  async function googleSignIn() {
      const { error } = supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
              scopes: 'https://www.googleapis.com/auth/calendar'
          }

      })
      if (error) {
          alert(error.message)
      }
  }
  async function signOut() {
      await supabase.auth.signOut();
    }

  const [messages, setMessages] = useState(() => {
    const storedMessages = localStorage.getItem('chatMessages');
    return storedMessages ? JSON.parse(storedMessages) : [];
  });
  const [inputMessage, setInputMessage] = useState('');

  const addMessage = (content, role) => {
    const newMessage = {
      content,
      role,
      time: new Date().toLocaleString(),
    };
    setMessages([...messages, newMessage]);
    scrollToBottom();
  };

  const handleSendMessage = async () => {
    setIsLoading(true);
    if (inputMessage.trim() !== '') {
      // Add the user message immediately
      let userMessage
      if (session == null){
        userMessage = {
          content: inputMessage,
          role: 'User',
          time: new Date().toLocaleString(),
          avatar: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Default_pfp.svg/2048px-Default_pfp.svg.png"
        };
      }else{
        userMessage = {
          content: inputMessage,
          role: `${session.user.user_metadata.full_name}`,
          time: new Date().toLocaleString(),
          avatar: `${session.user.user_metadata.avatar_url}`
        };
      }
      setMessages([...messages, userMessage]);
      scrollToBottom();
      setInputMessage('');
      const event = await Validator(inputMessage)
    //   const eventData = `
    //     {
    //       "Event": true,
    //       "EventTime": "2023-10-14T15:00:00",
    //       "EventTitle": "Dentist"
    //     }
    //   `
    //   const event = JSON.parse(eventData)
      console.log(event)  
      let answer 
      if (event.Event){
          if (!event.EventTitle && !event.EventTime) {
            answer = "Please specify the title & time for the event";
          } else if (!event.EventTitle) {
            answer = "Please specify event title for the event";
          } else if (!event.EventTime) {
            answer = "Please specify the time for the event";
          } else{
            await Calendar(event.EventTime, event.EventTitle, session)
            .then((res) => {
              answer = "Event scheduled succesfully"
            }).catch((err) => {
              answer = "There was an issue with your request make sure the lock icon is Closed as that means you are loged in otherwise click the opened lock to sign in to your google calendar"
            })
          }
          const assistantMessage = {
            content: `${answer}`,
            role: 'Assistant',
            time: new Date().toLocaleString(),
            avatar: "https://media.discordapp.net/attachments/758995681062551552/1163467695015079976/239881831_106264665106630_5836856143838661339_n.png?ex=653faeba&is=652d39ba&hm=dff9a0ea7fa4dae12b17561a6fe7fe1690af2bc3043d84d23e45770a63374162&=&width=549&height=549"
          };
          setIsLoading(false);
          setMessages((prevMessages) => [...prevMessages, assistantMessage]);
          scrollToBottom();
      }else{
        try {
          const response = await Api(inputMessage);
          console.log(`input is ${inputMessage}`)
          // Add the assistant message after receiving the response
          const assistantMessage = {
            content: response,
            role: 'Assistant',
            time: new Date().toLocaleString(),
            avatar: "https://media.discordapp.net/attachments/758995681062551552/1163467695015079976/239881831_106264665106630_5836856143838661339_n.png?ex=653faeba&is=652d39ba&hm=dff9a0ea7fa4dae12b17561a6fe7fe1690af2bc3043d84d23e45770a63374162&=&width=549&height=549"
          };
          setMessages((prevMessages) => [...prevMessages, assistantMessage]);
          scrollToBottom();
          console.log(response);
        } catch (error) {
          // Handle errors from the API call if needed
          console.error('Error fetching response from API:', error);
        }
      }
      setIsLoading(false);
    }
  };
  console.log(session)
  const clearChat = () => {
    localStorage.removeItem('chatMessages');
    setMessages([]);
    window.location.reload();
  }
  const handleInputChange = (event) => {
    setInputMessage(event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  };

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  return (
    <div>
      <div>
        <div ref={messagesContainerRef} className='messages'>
          {messages.map((message, index) => (
            <div key={index}>
              <div className="message">
                <div className='time'>
                  {message.time}
                </div>
                <div className='content'><img className='avatar' src={message.avatar}></img><strong className={message.role}>{message.role}:</strong> {message.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className='inputs'>
      {
            isLoading ?
              <input 
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled
              placeholder='Pls wait for the Asistant to respond before sending new requests'
              />
            :
            <input 
            type="text"
            value={inputMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

        }
        <button title="sendMessage" className='sendButton' onClick={handleSendMessage}>➤</button>
        <button title='clearChat' className='clearButton' onClick={clearChat}>⌫</button>
        {session ?
              <>
                <button title="signOut" className='googleButton' onClick={() => signOut()}>🔒</button>
              </>
              :
              <>
                <button title="signIn" className='googleButton' onClick={() => googleSignIn()}>🔓</button>
              </>
            }
      </div>
    </div>
  );
};

export default App;
