'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { FormEventHandler, useRef } from 'react';

export default function Chat() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { messages, sendMessage } = useChat<UIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    })
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (inputRef.current) {
      const userInput = inputRef.current?.value.trim();
      if (userInput) {
        sendMessage({ text: userInput });
      }
      inputRef.current.value = '';
    }
  }

  
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      <div className="space-y-4">
        {messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap">
            <div>
              <div className="font-bold">{m.role}</div>
              {m.parts.map((part, index) => {
                if (part.type === 'text') return <p key={index}>{part.state === 'streaming' ? <span className='animate-pulse'>Typing</span> : part.text}</p>;
                else if (part.type === 'tool-addResource') {
                  if (part.state === 'input-available' || part.state === 'input-streaming') return <p key={index} className='italic font-light'>Adding new resource...</p>;
                  else if (part.state === 'output-available') return <p key={index} className='italic font-light'>Resouce added</p>;
                }
                else if (part.type === 'tool-getInformation') {
                  if (part.state === 'input-available' || part.state === 'input-streaming') return <p key={index} className='italic font-light'>Getting information...</p>;
                  else if (part.state === 'output-available') return <p key={index} className='italic font-light'>Based on system information</p>;
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="fixed bottom-0 w-full max-w-md p-2 mb-8 border border-gray-300 rounded shadow-xl"
          placeholder="Say something..."
        />
      </form>
    </div>
  );
}