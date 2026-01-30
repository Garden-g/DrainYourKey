## Nano Banana Pro生图

```
from google import genai
from google.genai import types

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents="Generate an infographic of the current weather in Tokyo.",
    config=types.GenerateContentConfig(
        tools=[{"google_search": {}}],
        image_config=types.ImageConfig(
            aspect_ratio="16:9",
            image_size="4K"
        )
    )
)

image_parts = [part for part in response.parts if part.inline_data]

if image_parts:
    image = image_parts[0].as_image()
    image.save('weather_tokyo.png')
    image.show()
```



## 图片生成（根据文本生成图片）



```
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = ("Create a picture of a nano banana dish in a fancy restaurant with a Gemini theme")
response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```



## 图片修改（文字和图片转图片）

**提醒**：请确保您对上传的所有图片均拥有必要权利。 请勿生成会侵犯他人权利的内容，包括会欺骗、骚扰或伤害他人的视频或图片。使用此生成式 AI 服务时须遵守我们的[《使用限制政策》](https://policies.google.com/terms/generative-ai/use-policy?hl=zh-cn)。

提供图片，然后使用文本提示添加、移除或修改元素、更改样式或调整色彩分级。

以下示例演示了如何上传 `base64` 编码的图片。 如需了解多张图片、更大的载荷和支持的 MIME 类型，请参阅[图片理解](https://ai.google.dev/gemini-api/docs/image-understanding?hl=zh-cn)页面。



```
from google import genai
from google.genai import types
from PIL import Image

client = genai.Client()

prompt = (
    "Create a picture of my cat eating a nano-banana in a "
    "fancy restaurant under the Gemini constellation",
)

image = Image.open("/path/to/cat_image.png")

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[prompt, image],
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif part.inline_data is not None:
        image = part.as_image()
        image.save("generated_image.png")
```



### 多轮图片修改

继续以对话方式生成和修改图片。建议使用聊天或多轮对话的方式来迭代图片。以下示例展示了生成有关光合作用的信息图表的提示。



```
from google import genai
from google.genai import types

client = genai.Client()

chat = client.chats.create(
    model="gemini-3-pro-image-preview",
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        tools=[{"google_search": {}}]
    )
)

message = "Create a vibrant infographic that explains photosynthesis as if it were a recipe for a plant's favorite food. Show the \"ingredients\" (sunlight, water, CO2) and the \"finished dish\" (sugar/energy). The style should be like a page from a colorful kids' cookbook, suitable for a 4th grader."

response = chat.send_message(message)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image:= part.as_image():
        image.save("photosynthesis.png")
```

![关于光合作用的 AI 生成的信息图](https://ai.google.dev/static/gemini-api/docs/images/infographic-eng.png?hl=zh-cn)有关光合作用的 AI 生成的信息图

然后，您可以使用同一对话将图片中的文字更改为西班牙语。

[Python](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#python)[JavaScript](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#javascript)[Go](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#go)[Java](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#java)[REST](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#rest)

```
message = "Update this infographic to be in Spanish. Do not change any other elements of the image."
aspect_ratio = "16:9" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "2K" # "1K", "2K", "4K"

response = chat.send_message(message,
    config=types.GenerateContentConfig(
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        ),
    ))

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image:= part.as_image():
        image.save("photosynthesis_spanish.png")
```

![AI 生成的西班牙语光合作用信息图](https://ai.google.dev/static/gemini-api/docs/images/infographic-spanish.png?hl=zh-cn)AI 生成的西班牙语光合作用信息图









## Gemini 3 Pro Image 的新功能

Gemini 3 Pro Image (`gemini-3-pro-image-preview`) 是一款先进的图片生成和编辑模型，针对专业资源制作进行了优化。它旨在通过高级推理来应对最具挑战性的工作流程，擅长处理复杂的多轮创建和修改任务。

- **高分辨率输出**：内置了 1K、2K 和 4K 视觉效果生成功能。
- **高级文字渲染**：能够为信息图表、菜单、图表和营销素材资源生成清晰易读的风格化文字。
- **使用 Google 搜索进行接地**：模型可以使用 Google 搜索作为工具来验证事实，并根据实时数据（例如当前天气地图、股市图表、近期活动）生成图片。
- **思考模式**：模型会利用“思考”过程来推理复杂的提示。它会生成临时“思维图像”（在后端可见，但不收费），以在生成最终的高质量输出之前优化构图。
- **最多 14 张参考图片**：您现在最多可以混合使用 14 张参考图片来生成最终图片。

### 最多可使用 14 张参考图片

借助 Gemini 3 Pro 预览版，您最多可以混合使用 14 张参考图片。这 14 张图片可以包含以下内容：

- 最多 6 张高保真对象图片，用于包含在最终图片中
- 最多 5 张人物图片，以保持角色一致性

[Python](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#python)[JavaScript](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#javascript)[Go](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#go)[Java](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#java)[REST](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#rest)

```
from google import genai
from google.genai import types
from PIL import Image

prompt = "An office group photo of these people, they are making funny faces."
aspect_ratio = "5:4" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "2K" # "1K", "2K", "4K"

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=[
        prompt,
        Image.open('person1.png'),
        Image.open('person2.png'),
        Image.open('person3.png'),
        Image.open('person4.png'),
        Image.open('person5.png'),
    ],
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image:= part.as_image():
        image.save("office.png")
```

![AI 生成的办公室合影](https://ai.google.dev/static/gemini-api/docs/images/office-group-photo.jpeg?hl=zh-cn)AI 生成的办公室合影

### 使用 Google 搜索建立依据

使用 [Google 搜索工具](https://ai.google.dev/gemini-api/docs/google-search?hl=zh-cn)根据实时信息（例如天气预报、股市图表或近期活动）生成图片。

请注意，将“依托 Google 搜索进行接地”与图片生成功能搭配使用时，基于图片的搜索结果不会传递给生成模型，也不会包含在回答中。



```
from google import genai
prompt = "Visualize the current weather forecast for the next 5 days in San Francisco as a clean, modern weather chart. Add a visual on what I should wear each day"
aspect_ratio = "16:9" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['Text', 'Image'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
        ),
        tools=[{"google_search": {}}]
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image:= part.as_image():
        image.save("weather.png")
```

![AI 生成的旧金山五天天气图表](https://ai.google.dev/static/gemini-api/docs/images/weather-forecast.png?hl=zh-cn)旧金山未来五天的天气图表（由 AI 生成）

响应包含 `groundingMetadata`，其中包含以下必需字段：

- **`searchEntryPoint`**：包含用于呈现所需搜索建议的 HTML 和 CSS。
- **`groundingChunks`**：返回用于为生成的图片提供依据的前 3 个网络来源

### 生成分辨率高达 4K 的图片

Gemini 3 Pro Image 默认生成 1K 图片，但也可以输出 2K 和 4K 图片。如需生成更高分辨率的资源，请在 `generation_config` 中指定 `image_size`。

您必须使用大写“K”（例如，1K、2K、4K）。小写参数（例如，1k）将被拒绝。

[Python](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#python)[JavaScript](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#javascript)[Go](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#go)[Java](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#java)[REST](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#rest)

```
from google import genai
from google.genai import types

prompt = "Da Vinci style anatomical sketch of a dissected Monarch butterfly. Detailed drawings of the head, wings, and legs on textured parchment with notes in English." 
aspect_ratio = "1:1" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
resolution = "1K" # "1K", "2K", "4K"

client = genai.Client()

response = client.models.generate_content(
    model="gemini-3-pro-image-preview",
    contents=prompt,
    config=types.GenerateContentConfig(
        response_modalities=['TEXT', 'IMAGE'],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=resolution
        ),
    )
)

for part in response.parts:
    if part.text is not None:
        print(part.text)
    elif image:= part.as_image():
        image.save("butterfly.png")
```

以下是根据此提示生成的示例图片：

![AI 生成的达芬奇风格的解剖帝王蝶的解剖图。](https://ai.google.dev/static/gemini-api/docs/images/gemini3-4k-image.png?hl=zh-cn)AI 生成的达芬奇风格的解剖君主斑蝶的解剖草图。

### 思维过程

Gemini 3 Pro Image 预览版模型是一种思考模型，会使用推理流程（“思考”）来处理复杂的提示。此功能默认处于启用状态，并且无法在 API 中停用。如需详细了解思考过程，请参阅 [Gemini 思考](https://ai.google.dev/gemini-api/docs/thinking?hl=zh-cn)指南。

模型最多会生成两张临时图片，以测试构图和逻辑。“思考”中的最后一张图片也是最终渲染的图片。

您可以查看促成最终图片生成的想法。

[Python](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#python)[JavaScript](https://ai.google.dev/gemini-api/docs/image-generation?hl=zh-cn#javascript)

```
for part in response.parts:
    if part.thought:
        if part.text:
            print(part.text)
        elif image:= part.as_image():
            image.show()
```

#### 思考签名

思考签名是模型内部思考过程的加密表示形式，用于在多轮互动中保留推理上下文。所有响应都包含 `thought_signature` 字段。一般来说，如果您在模型响应中收到思考签名，则应在下一轮对话中发送对话历史记录时，完全按收到的原样将其传递回去。未能循环使用思维签名可能会导致回答失败。如需详细了解签名，请参阅[思想签名](https://ai.google.dev/gemini-api/docs/thought-signatures?hl=zh-cn)文档。

**注意**： 如果您使用官方 [Google Gen AI SDK](https://ai.google.dev/gemini-api/docs/libraries?hl=zh-cn) 并使用聊天功能（或将完整的模型回答对象直接附加到历史记录中），**思考签名会被自动处理**。您无需手动提取或管理它们，也无需更改代码。

思考签名的运作方式如下：

- 所有包含图片 `mimetype` 的 `inline_data` 部分（属于响应的一部分）都应具有签名。
- 如果想法之后（在任何图片之前）紧跟着一些文字部分，则第一个文字部分也应包含签名。
- 如果包含图片 `mimetype` 的 `inline_data` 部分是想法的一部分，则不会有签名。

以下代码展示了包含思维签名的示例：

```
[
  {
    "inline_data": {
      "data": "<base64_image_data_0>",
      "mime_type": "image/png"
    },
    "thought": true // Thoughts don't have signatures
  },
  {
    "inline_data": {
      "data": "<base64_image_data_1>",
      "mime_type": "image/png"
    },
    "thought": true // Thoughts don't have signatures
  },
  {
    "inline_data": {
      "data": "<base64_image_data_2>",
      "mime_type": "image/png"
    },
    "thought": true // Thoughts don't have signatures
  },
  {
    "text": "Here is a step-by-step guide to baking macarons, presented in three separate images.\n\n### Step 1: Piping the Batter\n\nThe first step after making your macaron batter is to pipe it onto a baking sheet. This requires a steady hand to create uniform circles.\n\n",
    "thought_signature": "<Signature_A>" // The first non-thought part always has a signature
  },
  {
    "inline_data": {
      "data": "<base64_image_data_3>",
      "mime_type": "image/png"
    },
    "thought_signature": "<Signature_B>" // All image parts have a signatures
  },
  {
    "text": "\n\n### Step 2: Baking and Developing Feet\n\nOnce piped, the macarons are baked in the oven. A key sign of a successful bake is the development of \"feet\"—the ruffled edge at the base of each macaron shell.\n\n"
    // Follow-up text parts don't have signatures
  },
  {
    "inline_data": {
      "data": "<base64_image_data_4>",
      "mime_type": "image/png"
    },
    "thought_signature": "<Signature_C>" // All image parts have a signatures
  },
  {
    "text": "\n\n### Step 3: Assembling the Macaron\n\nThe final step is to pair the cooled macaron shells by size and sandwich them together with your desired filling, creating the classic macaron dessert.\n\n"
  },
  {
    "inline_data": {
      "data": "<base64_image_data_5>",
      "mime_type": "image/png"
    },
    "thought_signature": "<Signature_D>" // All image parts have a signatures
  }
]
```

## 其他图片生成模式

Gemini 还支持其他基于提示结构和上下文的图片互动模式，包括：

- 文生图和文本（交织）

  ：输出包含相关文本的图片。

  - 提示示例：“生成一份图文并茂的海鲜饭食谱。”

- 图片和文本转图片和文本（交织）

  ：使用输入图片和文本创建新的相关图片和文本。

  - 提示示例：（附带一张带家具的房间的照片）“我的空间还适合放置哪些颜色的沙发？你能更新一下图片吗？”