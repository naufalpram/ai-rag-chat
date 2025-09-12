'use client';

import { MemoizedMarkdown } from '@/components/memoized-markdown';
import { Button } from '@/components/ui/button';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { FormEventHandler, Fragment, useEffect, useRef, useState } from 'react';
import { Bot, User, Square } from 'lucide-react';
import AddResourceDrawer from '@/components/add-resource-drawer';
import { Toaster } from 'sonner';
import { Source, Sources, SourcesContent, SourcesTrigger } from '@/components/ai-elements/sources';
import { GetInformationOutput } from './api/chat/tools';

const Chat = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, error, regenerate, setMessages, stop } = useChat<UIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'same-origin',
    })
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleResetChat = () => {
    setMessages([]);
  }

  const isLastMessage = (id: string) => {
    return id === messages[messages.length - 1].id
  };

  const lastMessageIsUser = messages[messages.length - 1]?.role === 'user';
  const isStreaming = status === 'submitted' || status === 'streaming';
  
  return (
    <>
      <div className="flex flex-col w-full max-w-2xl pb-24 pt-12 space-y-12 mx-auto stretch">
        <h1 className="text-2xl font-bold text-center">Ask EDTS Knowledge</h1>
        <div className="space-y-4">
          {messages.map(message => (
            <Fragment key={message.id}>
              {error && lastMessageIsUser ? (
                <>
                  <BasicMessageBlock role={message.role} text="Something wrong happened!" />
                  <Button variant="default" onClick={() => regenerate()}>Regenerate</Button>
                </>
              ) : <MessageBlock message={message} />}
              {(lastMessageIsUser && isLastMessage(message.id) && status === 'submitted') && (
                <BasicMessageBlock role="assistant" text="Thinking" contentClassName="animate-pulse" />
              )}
            </Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-4 mx-auto mb-8 px-3 py-2 w-full max-w-2xl flex gap-4 items-center rounded-xl bg-[#272727]/70">
          <form onSubmit={handleSubmit} className='w-full flex gap-4 items-center'>
            <input
              ref={inputRef}
              className="w-full p-2 border border-gray-300 rounded-md shadow-xl"
              placeholder="Say something..."
            />
            <Button type="button" onClick={!isStreaming ? handleSubmit : stop}>
              {isStreaming ? <span className="flex items-center gap-1"><Square size={16} /> Stop</span> : 'Submit'}
            </Button>
            <Button type="button" variant="secondary" disabled={isStreaming} onClick={handleResetChat}>Reset Chat</Button>
          </form>
        </div>
      </div>
      <section className="fixed right-8 bottom-8">
        <AddResourceDrawer />
      </section>
      <Toaster position="top-center" richColors />
    </>
  );
}

interface MessageBlockProps {
  message: UIMessage;
}

const MessageBlock = ({ message }: MessageBlockProps) => (
    <div className="whitespace-pre-wrap">
      <div>
        <div className="font-bold flex gap-2 items-center">{message.role === 'user' ? <User size={20} /> : <Bot size={20} />} {message.role}</div>
        <section className="pl-7">
          {message.parts.map((part, index) => {
              // text parts
              if (part.type === 'text') return <MemoizedMarkdown key={index} id={message.id} content={part.text} />;

              // add resource tool call
              else if (part.type === 'tool-addResource') {
                if (part.state === 'input-available' || part.state === 'input-streaming') return <p key={index} className='italic font-light'>Adding new resource...</p>;
                else if (part.state === 'output-available') return <p key={index} className='italic font-light'>Resource added</p>;
              }

              // get information tool call
              else if (part.type === 'tool-getInformation') {
                if (part.state === 'input-available' || part.state === 'input-streaming') return <p key={index} className='italic font-light'>Getting information...</p>;
                else if (part.state === 'output-available') {
                  const output = part.output as GetInformationOutput;
                  return (
                    <div key={part.toolCallId} className="relative">
                      <p key={index} className='italic font-light'>Based on system information</p>
                      {Array.isArray(output.sources) && output.sources.length > 0 && (
                        <Sources className="text-blue-400">
                          <SourcesTrigger count={output.sources.length} />
                          {output.sources.map((source, idx) => (
                            <SourcesContent key={`${message.id}-${idx}`}>
                              <Source title={source} />
                            </SourcesContent>
                          ))}
                        </Sources>
                      )}
                    </div>
                  );
                }
              }
          })}
        </section>
        
      </div>
    </div>
);

interface BasicMessageBlockProps {
  role: UIMessage['role'];
  text: string;
  contentClassName?: string;
}

const BasicMessageBlock = ({ role, text, contentClassName }: BasicMessageBlockProps) => (
  <div className="whitespace-pre-wrap">
    <div>
      <div className="font-bold flex gap-2 items-center">{role === 'user' ? <User size={20} /> : <Bot size={20} />} {role}</div>
      <section className="pl-7">
        <span className={contentClassName}>{text}</span>
      </section>
    </div>
  </div>
)

export default Chat;
