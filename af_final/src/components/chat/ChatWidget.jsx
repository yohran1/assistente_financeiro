import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react'
import { sendToAI, buildFinancialContext } from '../../lib/ai-router'
import { parseUserIntent, parseAiAction, executeChatAction, stripMarkdown } from '../../lib/chatActions'
import { useFinances } from '../../hooks/useFinances'
import DOMPurify from 'dompurify'
import toast from 'react-hot-toast'

const SYSTEM_PROMPT = `Voce e um assistente financeiro pessoal.
Respostas curtas, objetivas, em portugues brasileiro, sem markdown.
Quando registrar transacoes, confirme brevemente e peca para conferir no dashboard.`

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: 'Ola! Sou seu assistente financeiro. Posso registrar gastos, analisar suas financas e dar conselhos. Como posso ajudar?',
}

function ChatMessage({ message }) {
  const isAI = message.role === 'assistant'
  return (
    <div className={`flex gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}>
      {isAI && (
        <div className="w-7 h-7 rounded-full bg-brand-600/25 border border-brand-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={14} className="text-brand-400" aria-hidden="true" />
        </div>
      )}
      <div className={`
        max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
        ${isAI
          ? 'bg-white/[0.05] border border-white/[0.07] text-white/90 rounded-tl-md'
          : 'bg-brand-600/25 border border-brand-500/20 text-white rounded-tr-md'
        }
      `}>
        {message.content}
      </div>
      {!isAI && (
        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={14} className="text-white/60" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 justify-start">
      <div className="w-7 h-7 rounded-full bg-brand-600/25 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
        <Bot size={14} className="text-brand-400" />
      </div>
      <div className="bg-white/[0.05] border border-white/[0.07] rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40"
              style={{ animation: `bounceDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChatWidget() {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([INITIAL_MESSAGE])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef         = useRef(null)
  const inputRef               = useRef(null)
  const {
    profile, summary, categories,
    addTransaction, addPurchase, refresh,
  } = useFinances()

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  useEffect(() => {
    if (open) {
      scrollToBottom()
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [messages, open, scrollToBottom])

  const runAction = useCallback(async (action) => {
    if (!action) return false
    try {
      await executeChatAction(action, { addTransaction, addPurchase, refresh })
      toast.success('Transacao registrada via chat')
      return true
    } catch (err) {
      toast.error(err.message || 'Falha ao registrar transacao')
      return false
    }
  }, [addTransaction, addPurchase, refresh])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const cleanText    = DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    const userMessage  = { role: 'user', content: cleanText }
    const newMessages  = [...messages, userMessage]

    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const localIntent = parseUserIntent(cleanText)
      if (localIntent) {
        const ok = await runAction(localIntent)
        const reply = ok
          ? `Pronto! Registrei ${localIntent.description} de R$ ${localIntent.amount.toFixed(2).replace('.', ',')}. Confira no dashboard.`
          : 'Nao consegui registrar a transacao. Tente pelo botao Adicionar compra.'
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
        return
      }

      const context = buildFinancialContext({
        accountBalance:    profile?.account_balance,
        creditCardBalance: profile?.credit_card_balance,
        totalExpenses:     summary?.totalExpenses,
        totalIncome:       summary?.totalIncome,
        categories,
      })

      const aiResult = await sendToAI(
        [{ role: 'system', content: SYSTEM_PROMPT }, ...newMessages.slice(-12)],
        context
      )

      const raw = typeof aiResult === 'string' ? aiResult : aiResult.content
      const serverAction = typeof aiResult === 'object' ? aiResult.action : null
      const parsed = parseAiAction(raw)
      const action = serverAction || parsed.action
      let content = parsed.content || stripMarkdown(raw)

      if (action) {
        const ok = await runAction(action)
        if (ok && !content) {
          content = 'Transacao registrada. Confira no dashboard se esta correta.'
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: content || 'Ok.' }])
    } catch {
      toast.error('IA temporariamente indisponivel')
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Desculpe, estou com dificuldades no momento. Tente novamente em instantes.',
      }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, profile, summary, categories, runAction])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 112) + 'px'
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir assistente financeiro"
          className="
            fixed z-40
            bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))]
            right-4
            md:bottom-6 md:right-6
            w-14 h-14 min-w-[44px] min-h-[44px] rounded-full
            bg-brand-600 hover:bg-brand-500
            shadow-xl shadow-brand-600/30
            flex items-center justify-center
            transition-all duration-200 touch-press
            z-40
          "
        >
          <MessageCircle size={22} className="text-white" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#09090e]" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Assistente financeiro IA"
          aria-live="polite"
          className="
            fixed z-40 animate-slide-up
            inset-x-0 bottom-0 md:inset-auto
            md:bottom-6 md:right-6
            md:w-[360px] md:h-[520px]
            h-[75dvh]
            bg-[#0f0f1a] border border-white/[0.08]
            rounded-t-3xl md:rounded-3xl
            shadow-2xl flex flex-col overflow-hidden
          "
        >
          <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] flex-shrink-0">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/15 rounded-full md:hidden" />
            <div className="w-8 h-8 rounded-full bg-brand-600/25 flex items-center justify-center">
              <Bot size={16} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Assistente IA</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-white/30">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setOpen(false)}
                aria-label="Minimizar chat"
                className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white/60 transition-all"
              >
                <ChevronDown size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar chat"
                className="p-2 rounded-xl hover:bg-white/5 text-white/30 hover:text-white/60 transition-all"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-white/[0.06] flex-shrink-0"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre suas financas..."
                rows={1}
                disabled={loading}
                aria-label="Mensagem para o assistente"
                className="
                  flex-1 bg-white/[0.05] border border-white/10
                  rounded-2xl px-4 py-3
                  text-sm text-white placeholder:text-white/30
                  resize-none overflow-hidden
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40
                  transition-all disabled:opacity-50
                  min-h-[44px]
                "
                style={{ fontSize: '16px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                aria-label="Enviar mensagem"
                className="
                  w-11 h-11 rounded-2xl flex-shrink-0
                  bg-brand-600 hover:bg-brand-500
                  disabled:opacity-30 disabled:cursor-not-allowed
                  flex items-center justify-center
                  transition-all touch-press
                "
              >
                <Send size={16} className="text-white" />
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1.5 text-center hidden md:block">
              Enter para enviar · Shift+Enter nova linha
            </p>
          </div>
        </div>
      )}
    </>
  )
}
