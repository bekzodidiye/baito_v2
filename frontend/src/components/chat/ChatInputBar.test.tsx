import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { ChatInputBar } from './ChatInputBar';
import type { AttachedFileData } from '../../hooks/useChatScreen';

afterEach(cleanup);

const mockT = {
  attachFile: 'Fayl biriktirish',
  typeMessage: 'Xabarni yozing...',
  emoji: 'Emoji tanlash',
  send: 'Yuborish',
  previewLabel: 'Biriktirilgan fayllar',
};

const Harness = ({
  onSend,
  initialFiles = [],
}: {
  onSend?: () => void;
  initialFiles?: AttachedFileData[];
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<AttachedFileData[]>(initialFiles);

  return (
    <ChatInputBar
      inputText={text}
      setInputText={setText}
      attachedFiles={files}
      setAttachedFiles={setFiles}
      handleSend={onSend || vi.fn()}
      t={mockT}
    />
  );
};

describe('ChatInputBar - DEF-MEM-01 URL.revokeObjectURL and accessibility', () => {
  let revokeObjectURLSpy: any;
  let createObjectURLSpy: any;

  beforeEach(() => {
    createObjectURLSpy = vi.fn(() => 'blob:mock-url-123');
    revokeObjectURLSpy = vi.fn();
    (global as any).URL.createObjectURL = createObjectURLSpy;
    (global as any).URL.revokeObjectURL = revokeObjectURLSpy;
    if (typeof window !== 'undefined') {
      window.URL.createObjectURL = createObjectURLSpy;
      window.URL.revokeObjectURL = revokeObjectURLSpy;
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('renders accessible aria-labels on icon buttons and inputs', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: mockT.attachFile })).toBeDefined();
    expect(screen.getByRole('button', { name: mockT.emoji })).toBeDefined();
    expect(screen.getByRole('button', { name: mockT.send })).toBeDefined();
  });

  it('revokes object URL when the user removes the selected image', () => {
    render(<Harness />);

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(createObjectURLSpy).toHaveBeenCalled();

    const removeBtn = screen.getByRole('button', { name: /Faylni o'chirish/i });
    fireEvent.click(removeBtn);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-123');
  });

  it('revokes object URL when message is sent', () => {
    const handleSend = vi.fn();
    render(<Harness onSend={handleSend} />);

    const file = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const sendBtn = screen.getByRole('button', { name: mockT.send });
    fireEvent.click(sendBtn);

    expect(handleSend).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-123');
  });

  it('revokes object URL on unmount cleanup for any created object URLs', () => {
    const { unmount } = render(<Harness />);

    const file = new File(['dummy content'], 'cleanup.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(revokeObjectURLSpy).not.toHaveBeenCalled();

    unmount();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url-123');
  });
});
