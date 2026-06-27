import { useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Simple RTF editor: bold / italic / underline, lists, links, images.
// Images are embedded as base64 data URLs directly in the HTML content.
export default function RichEditor({ value, onChange, placeholder }) {
  const modules = useMemo(
    () => ({
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link', 'image'],
        ['clean'],
      ],
    }),
    []
  );

  const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'link', 'image'];

  return (
    <div className="bg-white rounded">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
