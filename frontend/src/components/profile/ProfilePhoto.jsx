import {
    useRef,
    useState,
} from "react";

import {
    Camera,
} from "lucide-react";

import {
    useAuth,
} from "../../context/AuthContext";

import api, {
    API_ORIGIN,
} from "../../api/api";


const ProfilePhoto = () => {

    const {
        user,
        setUser,
    } = useAuth();


    const inputRef = useRef(null);

    const [uploading, setUploading] =
        useState(false);


    const photoUrl =
        user?.photo_url
            ? `${API_ORIGIN}${user.photo_url}`
            : null;


    const handlePhotoChange =
        async (event) => {

            const file =
                event.target.files?.[0];


            if (!file) {
                return;
            }


            const formData =
                new FormData();

            formData.append(
                "photo",
                file
            );


            try {

                setUploading(true);


                const data =
                    await api(
                        "/auth/profile/photo",
                        {
                            method: "PUT",
                            body: formData,
                        }
                    );


                setUser((currentUser) => ({
                    ...currentUser,
                    photo_url:
                        data.photo_url,
                }));


            } catch (error) {

                alert(
                    error.message
                );

            } finally {

                setUploading(false);

                event.target.value = "";
            }
        };


    return (

        <div className="profile-photo-wrapper">

            <button
                type="button"
                className="profile-photo"
                onClick={() =>
                    inputRef.current?.click()
                }
                disabled={uploading}
            >

                {photoUrl ? (

                    <img
                        src={photoUrl}
                        alt="Photo de profil"
                    />

                ) : (

                    <span>
                        {user?.first_name
                            ?.charAt(0)
                            .toUpperCase()}
                    </span>

                )}


                <div className="profile-photo-camera">
                    <Camera size={14} />
                </div>

            </button>


            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                hidden
            />

        </div>
    );
};


export default ProfilePhoto;