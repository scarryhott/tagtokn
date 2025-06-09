import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const InstagramFeed = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const getMedia = httpsCallable(functions, 'getInstagramMedia');
        const result = await getMedia();
        setMedia(result.data.data || []);
      } catch (err) {
        console.error('Error fetching Instagram media:', err);
        setError('Failed to load Instagram feed');
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="text-center p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (media.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        No Instagram posts found. Start sharing on Instagram to see your posts here!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {media.map((item) => (
        <a
          key={item.id}
          href={item.permalink}
          target="_blank"
          rel="noopener noreferrer"
          className="block group relative rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
        >
          <div className="aspect-square bg-gray-100">
            <img
              src={item.media_type === 'VIDEO' ? item.thumbnail_url : item.media_url}
              alt={item.caption || 'Instagram post'}
              className="w-full h-full object-cover"
            />
          </div>
          {item.caption && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-end p-3 transition-all duration-300">
              <p className="text-white text-sm line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {item.caption}
              </p>
            </div>
          )}
        </a>
      ))}
    </div>
  );
};

export default InstagramFeed;
