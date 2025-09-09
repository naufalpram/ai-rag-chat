"use client"

import { FormEventHandler, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "./ui/input"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

const AddResourceDrawer = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit: FormEventHandler = async (e) => {
    e.preventDefault();
    const fileInputs = fileRef.current?.files;

    if (fileInputs && fileInputs.length > 0) {
      const file = fileInputs[0];
      try {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/resources/voyage', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? 'Upload failed');
        }
        toast.success('Resource uploaded successfully!');
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error(error instanceof Error ? error.message : 'Error, please try again');
      } finally {
        setIsProcessing(false);
        fileRef.current.value = "";
      }
    }
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Add Resource</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader>
            <DrawerTitle>Add New Resource</DrawerTitle>
            <DrawerDescription>Adding new resource to be used by EDTS Knowledge Assistant through file extraction, chunking, and embedding <br/>{'(Only accepts .html or .pdf files)'}</DrawerDescription>
          </DrawerHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-4 pb-0 flex items-center justify-center">
                <Input ref={fileRef} id="resource-file" type="file" accept=".pdf, .html" />
            </div>
            <DrawerFooter>
                <Button type="submit" disabled={isProcessing} className="w-full">
                  {isProcessing ? <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Processing...</span> : 'Submit'}
                </Button>
                <DrawerClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DrawerClose>
            </DrawerFooter>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default AddResourceDrawer;
