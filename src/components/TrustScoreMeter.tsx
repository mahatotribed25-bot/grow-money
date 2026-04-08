'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Text } from 'recharts';

const getScoreColor = (score: number) => {  
  if (score < 500) return '#ef4444'; // red-500
  if (score < 750) return '#facc15'; // yellow-400
  return '#22c55e'; // green-500
};

const TrustScoreMeter = ({ score }: { score: number }) => {
  const normalizedScore = Math.max(300, Math.min(score, 900));
  const angle = ((normalizedScore - 300) / 600) * 180;
  
  const data = [
    { name: 'Score', value: angle },
    { name: 'Remaining', value: 180 - angle },
  ];

  const color = getScoreColor(normalizedScore);

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={100}
            fill="#8884d8"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted))" />
          </Pie>
          <Text
            x="50%"
            y="90%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-5xl font-bold fill-foreground"
          >
            {Math.round(normalizedScore)}
          </Text>
          <Text
            x="50%"
            y="115%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-medium fill-muted-foreground"
          >
            Trust Score
          </Text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrustScoreMeter;
