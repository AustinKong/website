import azure from '../assets/icons/azure.svg';
import csharp from '../assets/icons/csharp.svg';
import docker from '../assets/icons/docker.svg';
import dotnet from '../assets/icons/dotnet.svg';
import express from '../assets/icons/express.svg';
import fastapi from '../assets/icons/fastapi.svg';
import java from '../assets/icons/java.svg';
import kubernetes from '../assets/icons/kubernetes.svg';
import nodejs from '../assets/icons/nodejs.svg';
import postgresql from '../assets/icons/postgresql.svg';
import python from '../assets/icons/python.svg';
import react from '../assets/icons/react.svg';
import sql from '../assets/icons/sql.svg';
import sqlServer from '../assets/icons/sql-server.svg';
import sqlite from '../assets/icons/sqlite.svg';
import supabase from '../assets/icons/supabase.svg';
import typescript from '../assets/icons/typescript.svg';
import unity from '../assets/icons/unity.svg';

export const technologies = {
	azure: { label: 'Azure', icon: azure.src },
	csharp: { label: 'C#', icon: csharp.src },
	docker: { label: 'Docker', icon: docker.src },
	dotnet: { label: '.NET', icon: dotnet.src },
	express: { label: 'Express', icon: express.src },
	fastapi: { label: 'FastAPI', icon: fastapi.src },
	java: { label: 'Java', icon: java.src },
	kubernetes: { label: 'Kubernetes', icon: kubernetes.src },
	nodejs: { label: 'Node.js', icon: nodejs.src },
	postgresql: { label: 'PostgreSQL', icon: postgresql.src },
	python: { label: 'Python', icon: python.src },
	react: { label: 'React', icon: react.src },
	sql: { label: 'SQL', icon: sql.src },
	'sql-server': { label: 'SQL Server', icon: sqlServer.src },
	sqlite: { label: 'SQLite', icon: sqlite.src },
	supabase: { label: 'Supabase', icon: supabase.src },
	typescript: { label: 'TypeScript', icon: typescript.src },
	unity: { label: 'Unity', icon: unity.src },
} as const;

export type Technology = keyof typeof technologies;
export const technologyKeys = Object.keys(technologies) as [
	Technology,
	...Technology[],
];
