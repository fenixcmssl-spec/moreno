'use client';

import React from 'react';
import Image from 'next/image';
import { BlogPost, SupportedLocale } from '@/types';
import { getTranslation } from '@/lib/i18n';
import { Calendar, User, ArrowRight } from 'lucide-react';

interface StorefrontBlogFeedProps {
  posts: BlogPost[];
  currentLocale: SupportedLocale;
}

export function StorefrontBlogFeed({ posts, currentLocale }: StorefrontBlogFeedProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <section className="mt-12 pt-8 border-t border-slate-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {getTranslation(currentLocale, 'store.blog_news_title', 'Noticias y Consejos de la Tienda')}
          </h2>
          <p className="text-xs text-slate-500">
            {getTranslation(currentLocale, 'store.blog_news_desc', 'Artículos oficiales, guías de compra y actualizaciones de catálogo')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.slice(0, 3).map((post) => (
          <article
            key={post.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between group"
          >
            <div>
              <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                <Image
                  src={post.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&q=80'}
                  alt={post.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="object-cover group-hover:scale-105 transition duration-300"
                />
                <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  {post.category}
                </span>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {post.author.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(post.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition line-clamp-2">
                  {post.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {post.excerpt}
                </p>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 transition cursor-pointer">
                <span>{getTranslation(currentLocale, 'store.read_more', 'Leer artículo completo')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
