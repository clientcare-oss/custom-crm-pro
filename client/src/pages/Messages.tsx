import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { MessageSquare, Send, User } from "lucide-react";
import VoiceTextarea from "@/components/VoiceTextarea";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
}

interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export default function Messages() {
  const { user } = useAuth();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get contacts list for admin to message
  const { data: contacts = [] } = trpc.contacts.list.useQuery();

  // Get messages for selected contact
  const { data: messages = [], refetch: refetchMessages } = trpc.messages.list.useQuery(
    { recipientId: selectedContact?.id ?? 0 },
    { enabled: !!selectedContact }
  );

  // Get unread count
  const { data: unreadMessages = [] } = trpc.messages.unread.useQuery();

  const sendMutation = trpc.messages.create.useMutation({
    onSuccess: () => {
      setNewMessage("");
      refetchMessages();
    },
    onError: (err) => toast.error(err.message),
  });

  const markReadMutation = trpc.messages.markAsRead.useMutation({
    onSuccess: () => refetchMessages(),
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (selectedContact && messages.length > 0) {
      messages.forEach((msg: Message) => {
        if (!msg.isRead && msg.senderId === selectedContact.id) {
          markReadMutation.mutate({ id: msg.id });
        }
      });
    }
  }, [selectedContact, messages]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedContact) return;
    sendMutation.mutate({
      recipientId: selectedContact.id,
      content: newMessage.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getUnreadCountForContact = (contactId: number) => {
    return unreadMessages.filter((m: Message) => m.senderId === contactId).length;
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4 p-6">
      {/* Contacts Sidebar */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No contacts yet. Add contacts to start messaging.
                </p>
              ) : (
                contacts.map((contact: Contact) => {
                  const unreadCount = getUnreadCountForContact(contact.id);
                  return (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-accent ${
                        selectedContact?.id === contact.id
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{contact.firstName} {contact.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.company || contact.email || "No details"}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedContact.firstName} {selectedContact.lastName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedContact.company || selectedContact.email}
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg: Message) => {
                      const isOwn = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-muted text-foreground rounded-bl-sm"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            <p
                              className={`text-[10px] mt-1 ${
                                isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <VoiceTextarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-[120px]"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendMutation.isPending}
                  size="icon"
                  className="h-11 w-11 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
