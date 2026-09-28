// Static courseware source composed only from english_note_item #1514 (put aside).
// It is shared by the desktop courseware sample and the mini-program preview.
export const putAsideCourseware = {
  phrase: "put aside",
  meaning: "把……放到一边；暂时不考虑；留出 / 存下",
  memory: "put = 放 · aside = 到旁边",
  useCases: [
    {
      number: "01",
      title: "把东西放到一边",
      description: "把……放到一边",
      tone: "physical",
      examples: [
        {
          english: "She put the book aside and answered the phone.",
          chinese: "她把书放到一边，然后接电话。",
        },
        {
          english: "Please put those documents aside for now.",
          chinese: "请先把那些文件放到一边。",
        },
      ],
    },
    {
      number: "02",
      title: "暂时不考虑 / 撇开",
      description: "put aside + differences / concerns / feelings / arguments",
      tone: "decision",
      examples: [
        {
          english: "We need to put aside our differences and work together.",
          chinese: "我们需要暂时搁置分歧，一起合作。",
        },
        {
          english: "Let’s put that issue aside for the moment.",
          chinese: "我们暂时先搁置这个问题。",
        },
      ],
    },
    {
      number: "03",
      title: "留出 / 存下一部分",
      description: "put aside money / time",
      tone: "reserve",
      examples: [
        {
          english: "I try to put aside some money every month.",
          chinese: "我每个月都会尽量存一些钱。",
        },
        {
          english: "We should put aside some time to review the design.",
          chinese: "我们应该留出一些时间来审核设计。",
        },
      ],
    },
  ],
  dialogue: [
    {
      speaker: "同事 A",
      english: "Let’s put aside the UI issue and focus on the API first.",
      chinese: "我们先把 UI 的问题放一放，优先处理 API。",
    },
    {
      speaker: "同事 B",
      english: "We need to put aside some time for testing.",
      chinese: "我们需要留出一些时间做测试。",
    },
    {
      speaker: "同事 A",
      english:
        "Putting aside performance concerns, the current design is quite flexible.",
      chinese: "暂且不考虑性能问题，目前这个设计还是比较灵活的。",
    },
  ],
  contrast: {
    putAside: {
      label: "更口语",
      meaning: "放一边 / 暂时不管",
      english: "Put aside your phone and listen.",
      chinese: "把手机放一边，听我说。",
    },
    setAside: {
      label: "也可表示留出，稍正式",
      meaning: "留出",
      english: "We set aside two hours for testing.",
      chinese: "我们专门留了两个小时做测试。",
    },
  },
  keySentence: {
    english: "Let’s put that aside for now.",
    chinese: "这件事我们现在先放一放。",
  },
  recap: "问题放一边 → 暂时不考虑；钱放一边 → 存起来；时间放一边 → 预留出来",
};
