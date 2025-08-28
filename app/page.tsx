'use client';

import { MemoizedMarkdown } from '@/components/memoized-markdown';
import { Button } from '@/components/ui/button';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { FormEventHandler, Fragment, useEffect, useRef, useState } from 'react';
import { Bot, User } from 'lucide-react';
import AddResourceDrawer from '@/components/add-resource-drawer';
import { Toaster } from 'sonner';

const Chat = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [addResourceActive, setAddResourceActive] = useState<boolean>(false);
  const { messages, sendMessage, status, error, regenerate } = useChat<UIMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      credentials: 'same-origin',
    }),

  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (inputRef.current) {
      const userInput = inputRef.current?.value.trim();
      if (userInput) {
        sendMessage(
          { text: userInput },
          {
            body: { addResourceMode: addResourceActive }
          }
        );
      }
      inputRef.current.value = '';
    }
  }

  const isLastMessage = (id: string) => {
    return id === messages[messages.length - 1].id
  };

  const lastMessageIsUser = messages[messages.length - 1]?.role === 'user';

  const handleSwitch = () => setAddResourceActive((prev) => !prev);
  
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
                <BasicMessageBlock role="assistant" text="Typing" contentClassName="animate-pulse" />
              )}
            </Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-4 mx-auto mb-8 px-3 py-2 w-full max-w-2xl flex gap-4 items-center rounded-lg bg-[#272727]/70">
          <form onSubmit={handleSubmit} className='w-full'>
            <input
              ref={inputRef}
              className="w-full p-2 border border-gray-300 rounded shadow-xl"
              placeholder="Say something..."
            />
          </form>
          {/* <Switch id="add-resource-mode" checked={addResourceActive} onClick={handleSwitch} />
          <Label htmlFor="add-resource-mode" className="text-sm text-white">Enable Add Resource</Label> */}
          <AddResourceDrawer />
        </div>
      </div>
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
                else if (part.state === 'output-available') return <p key={index} className='italic font-light'>Based on system information</p>;
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
