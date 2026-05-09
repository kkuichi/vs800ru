const rawComments = 
[
  {
    id: 1,
    user: "User",
    minutesAgo: 1,
    text: "Normal comment that is really normal nothing not normal in this",
    category: null,
  },
  {
    id: 2,
    user: "Maybe User",
    minutesAgo: 3,
    text: "Not normal comment in a way that it is really insulting to some people",
    category: "Insult",
    confidence: 92,
  },
  {
    id: 3,
    user: "Not an User",
    minutesAgo: 5,
    text: "Not normal comment in a way that it has profanity in it",
    category: "Profanity",
    confidence: 88,
  },
  {
    id: 4,
    user: "It can be your User",
    minutesAgo: 7,
    text: "Not normal comment in a way that it is really threatening to some people",
    category: "Thread",
    confidence: 90,
  },
  {
    id: 5,
    user: "What User",
    minutesAgo: 9,
    text: "Not normal comment in a way that it is really toxic to some people",
    category: "Toxicity",
    confidence: 84,
  },
  {
    id: 6,
    user: "When User",
    minutesAgo: 12,
    text: "Not normal comment in a way that it has an identity attack",
    category: "Identity attack",
    confidence: 95,
  },
];

const exampleComments = rawComments
  .slice()
  .sort((a, b) => a.minutesAgo - b.minutesAgo)
  .map((comment) => ({
    ...comment,
    timeAgo:
      comment.minutesAgo === 0
        ? "Just now"
        : `${comment.minutesAgo} min${comment.minutesAgo === 1 ? "" : "s"} ago`,
  }));

export default exampleComments;
