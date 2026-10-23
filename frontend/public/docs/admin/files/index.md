# The Files Buckets and Tools

See the following **2 steps** for adding a knowledge base to an assistant or allowing users to upload files.

## 1. Setup a Bucket

### What is a bucket?

Buckets are collections of files. The bucket settings also define how users interact with such buckets. The main difference between possible bucket setups is the bucket type. Select a type that fits your use case best:

| bucket type  | file upload by  | access across conversations |
|--------------|-----------------|-----------------------------|
| general      | administrator   | every user can query the files in every conversation
| user         | user            | the same user can select those files in any conversation with the same assistant
| conversation | user            | files are available in the conversation they where uploaded in only\*

\* Note that file uploads within the same scope are possible without a bucket, if the more expensive "Complete Files" tool (with stricter upload limits) is used in step 2.

### How to setup or edit a bucket?

Hover over bucket entries and click the icon for more options, which will become visible on their right. Then click the "Edit" or the "Remove" option. You can now edit the bucket. Note that a buckets type cannot be changed once a bucket has been created via a click on the plus icon.

| bucket type  | label in list  | allows multiple instances |
|--------------|----------------|---------------------------|
| general      | no extra label | yes                       |
| user         | user           | no                        |
| conversation | chat           | no                        |

The minimum requirements for a bucket are a valid Endpoint URL, a name and a bucket type. We recommend using any name, that will help you remember the purpose of this new bucket later.

Your infrastructure team will be able to let you know the Endpoint to use, if the REI-Server, that comes with Gaible was installed during the initial setup of Gaible. This server should be listed among the kubernetes pods with port 3201, and have a name ending in "-reis" (e.g. `http://YOUR-Gaible-reis:3201`). **If a bucket with a working Endpoint is setup you can reuse its address for new buckets.**

**If your are configuring a bucket of type general, you must upload files as an admin.** Just click the bucket, you want to upload to, and an upload-area, which you can click to select files will appear on the right. You can also drag and drop files into the upload-area.

## 2. Add a Tool to use the Bucket

In order to use a bucket, it has to be [connected to an AI assistant via a tool](/admin/assistants).

### List of File-Management-Tools

| bucket type  | tool           | visible result for the user                                   |
|--------------|----------------|---------------------------------------------------------------|
| general      | Files          | a more knowledgeable AI assistant to chat with.               |
| user         | Files          | a menu for selecting files or uploading to all conversations. |
| conversation | Files in Chat  | a **paperclip** icon for attaching files to chat questions.   |
| conversation | Complete Files | a **paperclip** icon for attaching files to chat questions.   |
| no bucket    | Vision         | a **paperclip** icon for attaching images to chat questions.  |

### The Paperclip Options

Three tools allow uploading files via the same paperclip ui, see the differences below.

| Difference     | Files in Chat                     | Complete Files                                 | Vision                                                                                                 |
|----------------|-----------------------------------|------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| Ideal for ...  | searching on many pages/documents | summarizing a file                             | recognizing things in images                                                                           |
| Research Scope | most relevant extracts            | the complete file                              | the attached image                                                                                     |
| Cost / Tokens  | the larger the files, the cheaper | the larger the files, the more expensive       | images are generally more expensive than short texts                                                   |
| Limits         | supports large/multiple files     | no support for multiple (or too large) files\* | images might be scaled and cropped automatically before being processed by the model, only png and jpg |

\**limited by input tokens of the LLM*
